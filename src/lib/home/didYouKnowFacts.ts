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
 * The home draws two facts per request (REQ-115's reasoning applies: the
 * draw runs server-side, so it never re-runs during hydration and cannot
 * desynchronise the client tree). With a bank this small, a curious reader
 * exhausts it in one sitting — growing it is the band's real maintenance
 * cost, not its integration.
 */

import { shuffleAnecdoteOrder } from "@/lib/home/anecdoteDeck";

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
 * The bank asserted a tier without ever naming a source. When the band showed
 * one fact per visit that was survivable; on a page that lists the whole
 * bank and invites a reader to cite it, printing « Source référencée » over
 * nothing is claiming an authority we cannot produce — the exact thing the
 * tier policy exists to prevent.
 */
export interface DidYouKnowSource {
  title: string;
  /**
   * Absent for a work that has no address — a 1937 monograph, a journal issue
   * that never went online. Inventing a plausible URL for one would be worse
   * than omitting it: a reader clicks it, lands nowhere, and learns that the
   * citations on this page are decorative.
   */
  url?: string;
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
  // ——————————————————————————————————————————————————————————————————————
  // Les noms que les voisins donnent
  //
  // The bank opened country-heavy: Monrovia, la Côte d'Ivoire, le Cameroun.
  // Those are the names a reader already half-knows. The corpus's real
  // holding is the other side of the ledger — the eight hundred fiches whose
  // `appellations` chapter records who named the people, in what language,
  // and what the word meant before it became an ethnonym. What follows is
  // drawn from there, one naming mechanism per anecdote.
  // ——————————————————————————————————————————————————————————————————————
  {
    id: "iteso-bakedi",
    headline:
      "Les Iteso ont longtemps été désignés par un mot qui veut dire « les nus ».",
    body: [
      "Bakedi — aussi écrit Bakidi — est le nom que les Baganda leur donnent au XIXᵉ siècle. Il qualifie une manière de se vêtir, jugée depuis l'extérieur, et il est aujourd'hui tenu pour insultant.",
      "Deux autres mots entourent le premier sans le dire. Teso ne nomme pas le peuple mais son territoire, et Ateso sa langue : trois entités, trois mots, que l'usage a fini par confondre en un seul. La frontière coloniale de 1902 a fait le reste, en séparant les Iteso de l'Ouganda de ceux du Kenya.",
    ],
    entities: [
      { kind: "people", id: "PPL_ITESO", label: "Iteso" },
      { kind: "country", id: "UGA", label: "Ouganda" },
      { kind: "country", id: "KEN", label: "Kenya" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Ateso (teo)",
        url: "https://www.ethnologue.com/language/teo/",
        tier: "official",
        notes:
          "Atteste les appellations Teso, Bakedi et Wamia et la répartition Ouganda-Kenya. Le sens de Bakedi et son caractère péjoratif sont rapportés par la notice de ce peuple dans l'atlas.",
      },
    ],
  },
  {
    id: "datoga-mangati",
    headline:
      "Les Datooga sont connus sous deux noms, et le plus courant signifie « les ennemis ».",
    body: [
      "Mang'ati est le mot par lequel les Maasai et plusieurs peuples bantous voisins les désignent. Ce n'est pas une description, c'est une position : le nom dit la relation, pas le peuple.",
      "L'autre nom courant, Barabaig, est celui du plus grand de leurs sous-groupes. Les Datooga en comptent au moins dix. Un peuple appelé par le nom de sa fraction la plus visible est un peuple dont on n'a compté qu'une partie — l'erreur est de recensement autant que de vocabulaire.",
    ],
    entities: [
      { kind: "people", id: "PPL_DATOGA", label: "Datooga" },
      { kind: "country", id: "TZA", label: "Tanzanie" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Datooga (tcc)",
        url: "https://www.ethnologue.com/language/tcc/",
        tier: "official",
        notes:
          "Atteste l'endonyme Datooga, les variantes Tatog et Barabaig et le rapport de sous-groupe.",
      },
      {
        title: "Glottolog — Datooga (dato1239)",
        url: "https://glottolog.org/resource/languoid/id/dato1239",
        tier: "official",
      },
    ],
  },
  {
    id: "azande-niamniam",
    headline:
      "Une calomnie faite aux Azande a fini par nommer une plante et entrer dans le turc.",
    body: [
      "Azande signifie dans leur langue « ceux qui possèdent beaucoup de terre ». Le nom que l'Europe a retenu au XIXᵉ siècle est un autre : Niam-Niam, employé par les voisins arabes puis par les explorateurs, et censé imiter le bruit d'une bouche qui mange. Il accusait tout un peuple de cannibalisme.",
      "Le mot a voyagé plus loin que l'accusation. Le turc yamyam en dérive. Une balsamine décrite par les botanistes porte encore le nom d'Impatiens niamniamensis. Une calomnie du XIXᵉ siècle survit ainsi dans une nomenclature qui ne sait plus ce qu'elle répète.",
    ],
    entities: [
      { kind: "people", id: "PPL_AZANDE_SUD", label: "Azande" },
      { kind: "country", id: "SSD", label: "Soudan du Sud" },
      { kind: "country", id: "COD", label: "République démocratique du Congo" },
      { kind: "country", id: "CAF", label: "République centrafricaine" },
    ],
    tier: "referenced",
    sources: [
      {
        title:
          "Evans-Pritchard, E. E. — Witchcraft, Oracles and Magic Among the Azande. Oxford University Press, 1937",
        tier: "referenced",
        notes:
          "L'ethnographie de référence sur les Azande, et la source de la distinction entre le peuple et la réputation qu'on lui a faite.",
      },
      {
        title: "SIL Ethnologue — Zande (zne)",
        url: "https://www.ethnologue.com/language/zne/",
        tier: "official",
        notes:
          "Atteste l'ethnonyme et les variantes, dont Niam-Niam, relevée comme appellation dépréciative.",
      },
    ],
  },
  {
    id: "wonnin-godie",
    headline:
      "Le nom officiel des Wonnin est un sobriquet de voisin : « chimpanzé-panthère ».",
    body: [
      "Gwèdji, en langue néyo, associe deux animaux pour qualifier un caractère jugé belliqueux. Les Néyo l'appliquent à leurs voisins ; la forme francisée Godié est aujourd'hui celle des cartes, des recensements et des codes de langue.",
      "Wonnin est le nom que le groupe se donne. Il n'a jamais quitté l'usage domestique, ce qui laisse le sobriquet occuper seul l'espace public — l'ordinaire de cette page : le nom qui circule est rarement celui qu'on s'est choisi.",
    ],
    entities: [
      { kind: "people", id: "PPL_WONNIN", label: "Wonnin (Godié)" },
      { kind: "country", id: "CIV", label: "Côte d'Ivoire" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Godié (god)",
        url: "https://www.ethnologue.com/language/god/",
        tier: "official",
        notes:
          "Atteste l'appellation Godié et ses variantes. L'étymologie néyo Gwèdji est rapportée par la notice de ce peuple dans l'atlas.",
      },
    ],
  },
  {
    id: "murle-moden",
    headline:
      "Trois voisins ont donné trois noms différents aux Murle, et les Murle n'ont qu'un mot pour les trois.",
    body: [
      "Beir chez les Dinka, Jebe chez les Luo et les Nuer, Ajibba chez les Anuak : la littérature coloniale britannique enregistre ces trois formes avant que l'autonyme Murle ne soit reconnu. Un peuple porte autant de noms qu'il a de voisins.",
      "La symétrie est exacte de l'autre côté. En murle, tous les non-Murle sont moden — un seul mot, qui dit à la fois l'étranger et l'ennemi. Nommer ses voisins et être nommé par eux sont le même geste, pris dans les deux sens.",
    ],
    entities: [
      { kind: "people", id: "PPL_MURLE", label: "Murle" },
      { kind: "country", id: "SSD", label: "Soudan du Sud" },
      { kind: "country", id: "ETH", label: "Éthiopie" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "WALS Online — Murle (ISO 639-3 : mur)",
        url: "https://wals.info/languoid/lect/wals_code_mrl",
        tier: "official",
      },
      {
        title: "Glottolog — Murle (murl1244)",
        url: "https://glottolog.org/resource/languoid/id/murl1244",
        tier: "official",
        notes:
          "Atteste l'ethnonyme et les exonymes voisins. Le sens de moden est rapporté par la notice de ce peuple dans l'atlas.",
      },
    ],
  },
  {
    id: "kirdi-paien",
    headline:
      "« Kirdi » ne désigne aucun peuple : il désigne quarante peuples qui ont refusé l'islam.",
    body: [
      "Le mot vient du kanouri-haoussa et signifie païen. Les populations islamisées du nord du Cameroun et du Tchad — Peuls, Mandaras, Kotokos — l'appliquent à celles qui ne le sont pas. La première mention occidentale date du récit de voyage du major Denham, en 1826, sous la forme Kerdies.",
      "Il recouvre plus de quarante ethnies sans parenté linguistique ni culturelle, dont la seule chose commune est ce refus. Depuis les années 1990, un mouvement politique l'a retourné en « Kirditude » et s'en sert comme drapeau — un des rares cas où une insulte de vainqueur est reprise par ceux qu'elle visait.",
    ],
    entities: [
      { kind: "people", id: "PPL_KIRDI", label: "Kirdi" },
      { kind: "country", id: "CMR", label: "Cameroun" },
      { kind: "country", id: "TCD", label: "Tchad" },
      { kind: "country", id: "NGA", label: "Nigeria" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Mafa (maf)",
        url: "https://www.ethnologue.com/language/maf/",
        tier: "official",
        notes:
          "Atteste l'une des langues rassemblées sous l'étiquette. L'étymologie et la mention de Denham en 1826 sont rapportées par la notice de ce peuple dans l'atlas.",
      },
    ],
  },
  {
    id: "bambara-refus",
    headline: "Bambara veut probablement dire « ceux qui refusent ».",
    body: [
      "L'étymologie est débattue — on l'a rattachée à l'arabe comme au mandingue — mais le sens que retiennent les sources du XVIIIᵉ siècle est stable : infidèle, mécréant. Le mot est alors employé par les Mandingues islamisés pour désigner les Bamana restés animistes.",
      "Bamana est la forme que les locuteurs emploient. Bambara, lui, a suivi le chemin inverse de la plupart des noms de cette page : porté par l'usage jusqu'à en perdre sa charge, il nomme aujourd'hui une langue véhiculaire que des millions de personnes parlent sans y entendre le reproche d'origine.",
    ],
    entities: [
      { kind: "people", id: "PPL_BAMBARA", label: "Bambara (Bamana)" },
      { kind: "country", id: "MLI", label: "Mali" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Bambara (bam)",
        url: "https://www.ethnologue.com/language/bam/",
        tier: "official",
        notes:
          "Atteste les formes Bambara et Bamana et le statut véhiculaire de la langue. L'étymologie dépréciative est rapportée par la notice de ce peuple dans l'atlas, qui la donne pour débattue.",
      },
    ],
  },
  {
    id: "dogon-habe",
    headline:
      "Dans les sources anciennes, les Dogon s'appellent Habe — un mot peul pour « étranger ».",
    body: [
      "Habe est employé par les Peuls pour désigner ceux qui ont refusé l'islamisation ; le mot dit à la fois l'étranger et le paysan, et il est utilisé péjorativement. Les références anciennes le mettent régulièrement à la place de Dogon.",
      "Dogon a fini par s'imposer partout, y compris chez les intéressés. Ce que le nom unique masque, c'est qu'il recouvre une douzaine de langues et une cinquantaine de sous-dialectes dont beaucoup ne s'entendent pas entre eux : l'unité dogon est culturelle et territoriale avant d'être linguistique.",
    ],
    entities: [
      { kind: "people", id: "PPL_DOGON", label: "Dogon" },
      { kind: "country", id: "MLI", label: "Mali" },
      { kind: "country", id: "BFA", label: "Burkina Faso" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "UNESCO — Falaises de Bandiagara, pays dogon",
        url: "https://whc.unesco.org/fr/list/516/",
        tier: "official",
        notes:
          "Atteste le territoire et la désignation Dogon. L'exonyme peul Habe et son sens sont rapportés par la notice de ce peuple dans l'atlas.",
      },
    ],
  },
  {
    id: "le-nom-est-une-reponse",
    headline:
      "Trois peuples d'Afrique de l'Ouest portent pour nom la réponse qu'un ancêtre a faite à une question.",
    body: [
      "Les Nankana du Ghana sont administrativement des Frafra depuis les Britanniques. Le mot est la corruption d'une salutation en gurune, Ya fara fara ? — « comment va ton travail, ta peine ? ». On a pris la formule de politesse pour le nom du peuple qui la prononçait.",
      "Le même accident se répète deux fois. Busanga, l'exonyme des Bissa, vient de bisag gua — « homme bissa » —, la réponse donnée aux premiers Européens qui demandaient qui ils étaient. Et les Ma'di du Nil rapportent que leur nom vient de madi, « une personne », répondu dans les mêmes circonstances. Trois fois, la question « qui êtes-vous ? » a produit un nom qui n'en était pas un.",
    ],
    entities: [
      { kind: "people", id: "PPL_NANKANA", label: "Nankana (Frafra)" },
      { kind: "people", id: "PPL_BUSANSI", label: "Bissa" },
      { kind: "people", id: "PPL_MADI", label: "Ma'di" },
      { kind: "country", id: "GHA", label: "Ghana" },
      { kind: "country", id: "BFA", label: "Burkina Faso" },
      { kind: "country", id: "UGA", label: "Ouganda" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Farefare (gur)",
        url: "https://www.ethnologue.com/language/gur/",
        tier: "official",
        notes: "Atteste l'appellation Frafra et ses variantes.",
      },
      {
        title: "SIL Ethnologue — Bisa (bib)",
        url: "https://www.ethnologue.com/language/bib/",
        tier: "official",
        notes: "Atteste les formes Bissa, Busansi et Busanga.",
      },
      {
        title: "SIL Ethnologue — Ma'di (mhi)",
        url: "https://www.ethnologue.com/language/mhi/",
        tier: "official",
        notes:
          "Atteste l'ethnonyme. Les trois récits d'origine sont rapportés par les fiches AFRIK des peuples concernés, qui les donnent pour traditionnels.",
      },
    ],
  },
  {
    id: "guere-wobe",
    headline:
      "Un même peuple s'appelle Guéré en Côte d'Ivoire et Krahn au Liberia, et Wè chez lui.",
    body: [
      "Wè est le nom que ce peuple se donne — les sources le glosent « les hommes qui pardonnent facilement ». Guéré est l'exonyme qu'un administrateur colonial français a introduit, et la France y a ajouté une division interne, Guéré au sud, Wobé au nord, qui ne correspondait à aucune frontière culturelle ni linguistique préexistante.",
      "De l'autre côté de la ligne coloniale, au Liberia, les mêmes gens sont nommés Krahn par leurs voisins kru. Quatre noms pour un peuple, dont trois viennent de l'extérieur — et la division inventée s'est institutionnalisée jusqu'à devenir vraie.",
    ],
    entities: [
      { kind: "people", id: "PPL_GUERE", label: "Guéré" },
      { kind: "people", id: "PPL_WE", label: "Wè" },
      { kind: "country", id: "CIV", label: "Côte d'Ivoire" },
      { kind: "country", id: "LBR", label: "Liberia" },
    ],
    tier: "referenced",
    sources: [
      {
        title:
          "Holsoe, S. E. & Lauer, J. — « Who Are the Kran/Guere and the Gio/Yacouba? », African Studies Review 19(1), 1976",
        url: "https://www.cambridge.org/core/journals/african-studies-review/article/who-are-the-kranguere-and-the-gioyacouba-ethnic-identifications-along-the-liberiaivory-coast-border/4E33CA4D6CDC5962A21AEE535A3E10AD",
        tier: "referenced",
        notes:
          "L'article qui pose la question de l'identité de ce groupe de part et d'autre de la frontière Liberia-Côte d'Ivoire.",
      },
      {
        title: "SIL Ethnologue — Wè Southern (gxx)",
        url: "https://www.ethnologue.com/language/gxx/",
        tier: "official",
        notes: "Atteste les appellations Wè, Guéré, Wobé et Krahn.",
      },
    ],
  },
  // ——————————————————————————————————————————————————————————————————————
  // Les noms que l'administration a créés
  // ——————————————————————————————————————————————————————————————————————
  {
    id: "bamileke-cent-royaumes",
    headline:
      "« Bamiléké » est une étiquette allemande posée sur une centaine de royaumes.",
    body: [
      "L'administration coloniale du Kamerun l'introduit à partir de 1884 pour désigner collectivement les populations des hauts plateaux de l'Ouest. L'étymologie reste débattue ; l'une des lectures la rend par « les gens du bas », en référence à la position des arrivants venus des plaines du nord.",
      "Sous le mot unique, il y a une centaine de fondoms, chacun avec sa langue, son chef et son histoire — et c'est par le nom de son fondom qu'un Bamiléké se désigne d'ordinaire. L'étiquette a effacé cette diversité avant d'être instrumentalisée dans les tensions politiques de l'après-indépendance.",
    ],
    entities: [
      { kind: "people", id: "PPL_BAMILEKE", label: "Bamiléké" },
      { kind: "country", id: "CMR", label: "Cameroun" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — sous-groupe bamiléké",
        url: "https://www.ethnologue.com/subgroup/589/",
        tier: "official",
        notes:
          "Atteste la pluralité des langues rassemblées sous l'étiquette. L'origine administrative allemande et l'étymologie débattue sont rapportées par la notice de ce peuple dans l'atlas.",
      },
    ],
  },
  {
    id: "sara-douzaine",
    headline:
      "Les Sara ne se sont jamais appelés Sara : le mot vient de ceux qui les regardaient.",
    body: [
      "Il désigne un ensemble de peuples non musulmans du sud du Tchad dont les langues s'entendent entre elles. Chacun d'eux se nomme autrement — Ngambay, Sar, Mbay — et aucun n'employait le terme collectif.",
      "L'administration coloniale française l'a amplifié, et l'indépendance lui a donné une réalité politique qu'il n'avait pas. Un regroupement fait de l'extérieur pour la commodité du classement finit par produire le groupe qu'il prétendait décrire.",
    ],
    entities: [
      { kind: "people", id: "PPL_SARA", label: "Sara" },
      { kind: "country", id: "TCD", label: "Tchad" },
      { kind: "country", id: "CAF", label: "République centrafricaine" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Ngambay (sba)",
        url: "https://www.ethnologue.com/language/sba/",
        tier: "official",
        notes:
          "Atteste l'une des langues rassemblées sous l'étiquette et le nom que ce groupe se donne.",
      },
      {
        title: "Glottolog — Ngambay (ngam1268)",
        url: "https://glottolog.org/resource/languoid/id/ngam1268",
        tier: "official",
      },
    ],
  },
  {
    id: "bete-plantation",
    headline:
      "L'ethnie bété a été assemblée par l'administration coloniale à partir de 93 sous-groupes.",
    body: [
      "Le terme est d'origine locale et ne porte pas de charge coloniale repérable ; ce qui est colonial, c'est le périmètre. Il aurait émergé comme désignation générique des populations travaillant sur les plantations, avant d'être fixé comme catégorie administrative française.",
      "Ces 93 sous-groupes n'avaient aucune unité politique précoloniale. Magwé, l'ethnonyme traditionnel le plus ancien, est partagé avec les Wè, dont les Bété tiennent un ancêtre commun — une parenté que la nouvelle étiquette a rendue invisible.",
    ],
    entities: [
      { kind: "people", id: "PPL_BETE", label: "Bété" },
      { kind: "country", id: "CIV", label: "Côte d'Ivoire" },
    ],
    tier: "referenced",
    sources: [
      {
        title:
          "Dozon, Jean-Pierre — La société bété : histoires d'une ethnie de Côte d'Ivoire. Karthala / ORSTOM, 1985",
        url: "https://www.documentation.ird.fr/hor/fdi:17296",
        tier: "referenced",
        notes:
          "L'étude qui pose la formation de l'ethnie bété comme un processus historique plutôt que comme un donné.",
      },
      {
        title: "Ethnologue — Bété, Daloa (bev)",
        url: "https://www.ethnologue.com/language/bev/",
        tier: "official",
        notes:
          "Atteste que trois langues distinctes portent aujourd'hui le nom bété.",
      },
    ],
  },
  {
    id: "bassa-nge-distinction",
    headline:
      "Un nom colonial a, pour une fois, empêché une confusion au lieu d'en créer une.",
    body: [
      "Deux peuples sans lien — les Bassa Nge, d'origine nupe, et les Bassa Komu, dont la langue est benue-congo — ont migré presque en même temps vers la même province coloniale britannique, dite province de Bassa. Sous le seul nom de Bassa, ils auraient été comptés comme un.",
      "Les administrateurs ont ajouté le suffixe nupe Nge pour les distinguer. La distinction tient encore. C'est l'exception qui mesure la règle : ailleurs, la même administration a passé son temps à fondre en une case des peuples que rien ne rapprochait.",
    ],
    entities: [
      { kind: "people", id: "PPL_BASSA_NIGERIA", label: "Bassa Nge" },
      { kind: "country", id: "NGA", label: "Nigeria" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "Glottolog — langues nupoïdes (nupo1239)",
        url: "https://glottolog.org/resource/languoid/id/nupo1239",
        tier: "official",
        notes:
          "Atteste le rattachement nupe des Bassa Nge, et donc leur distance d'avec les Bassa Komu.",
      },
      {
        title: "SIL Ethnologue — Nupe-Nupe-Tako (nup)",
        url: "https://www.ethnologue.com/language/nup/",
        tier: "official",
      },
    ],
  },
  {
    id: "tswa-recensement",
    headline:
      "Les Vatswa disparaissent à chaque recensement, absorbés dans une case voisine.",
    body: [
      "Les recensements mozambicains les comptent comme Tsonga. L'étiquette Shangaan, tirée du nom du chef Soshangane, leur a été appliquée par extension alors que les Vatswa précèdent historiquement son empire.",
      "Un nom qui n'a pas sa case administrative n'a pas d'existence statistique : il n'apparaît dans aucun tableau, donc dans aucune politique publique. La confusion remonte à l'administration coloniale portugaise, qui écrivait Tshwa, et elle a survécu à tous les États qui ont suivi.",
    ],
    entities: [
      { kind: "people", id: "PPL_TSWA_MOZ", label: "Vatswa" },
      { kind: "people", id: "PPL_RONGA", label: "Ronga" },
      { kind: "country", id: "MOZ", label: "Mozambique" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Tswa (tsc)",
        url: "https://www.ethnologue.com/language/tsc/",
        tier: "official",
        notes:
          "Atteste le xitswa comme langue distincte et ses appellations concurrentes.",
      },
      {
        title: "CLEAR Global — Language data for Mozambique (2024)",
        url: "https://clearglobal.org/language-data-for-mozambique/",
        tier: "referenced",
        notes:
          "Documente l'écart entre les langues effectivement parlées et les catégories du recensement.",
      },
    ],
  },
  {
    id: "hutu-cartes-identite",
    headline:
      "Personne ne s'accorde sur ce que veut dire Hutu, et une administration en a fait une race.",
    body: [
      "L'étymologie est disputée depuis un siècle. Ernest Viaene, en 1910, propose « esclave ». René Bourgeois le réfute et propose l'inverse, « seigneurs » — chez les Mongo du Congo, les mots apparentés Bahoto et Bawoto désignent bien des dirigeants. Le mot que les intéressés emploient est Abahutu.",
      "L'incertitude n'a gêné personne. Dans les années 1920, l'administration coloniale belge institue des cartes d'identité ethniques obligatoires et fait de la distinction Hutu-Tutsi une hiérarchie fixe, tranchée notamment sur le nombre de vaches possédées. Une catégorie dont le sens n'était pas établi a été rendue administrativement irréversible.",
    ],
    entities: [
      { kind: "people", id: "PPL_KIRUNDI_HUTU", label: "Hutu" },
      { kind: "country", id: "RWA", label: "Rwanda" },
      { kind: "country", id: "BDI", label: "Burundi" },
    ],
    tier: "referenced",
    sources: [
      {
        title:
          "United States Holocaust Memorial Museum — Divided by Ethnicity: Rwanda",
        url: "https://www.ushmm.org/genocide-prevention/countries/rwanda/divided-by-ethnicity",
        tier: "referenced",
        notes:
          "Atteste l'institution des cartes d'identité ethniques par l'administration coloniale belge et ses critères.",
      },
      {
        title: "SIL Ethnologue — Kirundi (run)",
        url: "https://www.ethnologue.com/language/run",
        tier: "official",
        notes:
          "Atteste la langue commune aux trois catégories. Les deux étymologies concurrentes sont rapportées par la notice de ce peuple dans l'atlas, qui les donne pour débattues.",
      },
    ],
  },
  {
    id: "kasem-gurunsi",
    headline:
      "« Gurunsi » signifie « le fer ne pénètre pas » : c'était le nom d'une troupe, pas d'un peuple.",
    body: [
      "Le mot est d'origine djerma. Il désignait les soldats que le chef de guerre Babatu recruta dans les années 1890 parmi plusieurs groupes de la région — une formule de protection, portée par des hommes réputés invulnérables aux armes.",
      "Les colonisateurs européens l'ont repris comme nom d'ethnie. Les Kasena, qu'il englobe, n'ont de parenté proche ni linguistique ni culturelle avec tous ceux qu'il recouvre. Et le partage franco-britannique de 1898 les a coupés en deux communautés, l'une au Ghana, l'autre au Burkina Faso.",
    ],
    entities: [
      { kind: "people", id: "PPL_KASEM", label: "Kasena" },
      { kind: "country", id: "GHA", label: "Ghana" },
      { kind: "country", id: "BFA", label: "Burkina Faso" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Kasem (xsm)",
        url: "https://www.ethnologue.com/language/xsm/",
        tier: "official",
        notes:
          "Atteste la langue, l'autonyme Kasena et la répartition de part et d'autre de la frontière.",
      },
      {
        title: "WALS Online — Kasem",
        url: "https://wals.info/languoid/lect/wals_code_ksm",
        tier: "official",
      },
    ],
  },
  // ——————————————————————————————————————————————————————————————————————
  // Les noms que le commerce a laissés
  // ——————————————————————————————————————————————————————————————————————
  {
    id: "dioula-metier",
    headline: "Les Dioula portent pour nom de peuple un nom de métier.",
    body: [
      "Dioula est un nom commun mandingue : marchand, commerçant itinérant. Il s'est appliqué aux communautés mandé islamisées spécialisées dans le commerce à longue distance, jusqu'à devenir leur ethnonyme. En Afrique de l'Ouest anglophone, les mêmes réseaux s'appellent Wangara.",
      "Le peuple lui-même dit Julakan, « les gens du commerce » — il assume donc le métier comme identité. Un piège demeure pour le lecteur pressé : les Diola de Casamance n'ont rien à voir, ni la langue, ni la famille, ni l'histoire. Deux noms voisins à l'œil, deux peuples sans rapport.",
    ],
    entities: [
      { kind: "people", id: "PPL_DIOULA", label: "Dioula" },
      { kind: "country", id: "CIV", label: "Côte d'Ivoire" },
      { kind: "country", id: "BFA", label: "Burkina Faso" },
      { kind: "country", id: "MLI", label: "Mali" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Jula (dyu)",
        url: "https://www.ethnologue.com/language/dyu/",
        tier: "official",
        notes:
          "Atteste les graphies Dioula, Jula, Dyula et l'aire des réseaux marchands.",
      },
    ],
  },
  {
    id: "teke-vendre",
    headline: "En langue teke, « teke » veut dire vendre.",
    body: [
      "Le nom du peuple est le verbe de son activité historique. Le préfixe bantou donne BaTeke au pluriel, MuTeke au singulier : « ceux du commerce », en un seul mot.",
      "C'est le même geste que chez les Dioula, à trois mille kilomètres et dans une autre famille de langues. Quand un peuple tient les routes, ce sont les routes qui finissent par le nommer.",
    ],
    entities: [
      { kind: "people", id: "PPL_TEKE_NORD", label: "Teke" },
      { kind: "country", id: "COG", label: "Congo" },
      { kind: "country", id: "GAB", label: "Gabon" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Teke-Tege (teg)",
        url: "https://www.ethnologue.com/language/teg/",
        tier: "official",
        notes:
          "Atteste l'ethnonyme et ses formes préfixées. Le sens du radical est rapporté par la notice de ce peuple dans l'atlas.",
      },
    ],
  },
  {
    id: "tetela-watetera",
    headline:
      "« Batetela » est apparu dans des revues de géographie européennes entre 1885 et 1887.",
    body: [
      "Le mot dérive de Watetera, terme arabe qui désignait les populations du Maniema à l'époque du commerce esclavagiste. Il entre dans la littérature savante avec les explorateurs, et n'en est jamais ressorti : c'est aujourd'hui le nom courant.",
      "Le nom que le peuple se donne dit autre chose. Motetela viendrait d'une divinité locale, et se traduit « celui qui ne rit pas » ou « celui dont on ne peut se moquer ». Deux noms, deux points de vue, et un seul a été imprimé.",
    ],
    entities: [
      { kind: "people", id: "PPL_TETELA", label: "Tetela" },
      { kind: "country", id: "COD", label: "République démocratique du Congo" },
    ],
    tier: "unverified",
    sources: [
      {
        title: "Tangaza University — A Collection of 100 Tetela Proverbs",
        url: "https://afriprov.tangaza.ac.ke/wp-content/uploads/2008/11/ebooks_tetela.pdf",
        tier: "referenced",
        notes:
          "Recueil de proverbes en tetela. Il documente la langue, non l'étymologie de l'ethnonyme : les deux origines rapportées ici viennent de la notice de ce peuple dans l'atlas et n'ont pas de source dédiée, d'où la fiabilité basse du fait.",
      },
    ],
  },
  {
    id: "tabwa-attache",
    headline:
      "Le nom des Tabwa viendrait d'un verbe de leur langue qui signifie « être attaché ».",
    body: [
      "Le rapprochement renvoie à la période où ils furent pris dans la traite. Si l'étymologie tient, c'est un peuple qui porte le nom de ce qui lui a été fait.",
      "L'identité tabwa est elle-même en partie coloniale : ce qui s'appelle aujourd'hui les Tabwa était une série de villages distincts, aux histoires différentes, que l'administration belge a réunis sous un seul nom. La frontière avec les Lungu voisins reste floue, et plusieurs sources confondent les deux.",
    ],
    entities: [
      { kind: "people", id: "PPL_TABWA", label: "Tabwa" },
      { kind: "country", id: "COD", label: "République démocratique du Congo" },
      { kind: "country", id: "ZMB", label: "Zambie" },
    ],
    tier: "unverified",
    sources: [
      {
        title:
          "Roberts, Allen F. — The Rising of a New Moon: A Century of Tabwa Art. University of Michigan Museum of Art, 1985",
        tier: "referenced",
        notes:
          "L'étude de référence sur les Tabwa et sur la formation coloniale de leur identité. L'étymologie « être attaché » est rapportée par la notice de ce peuple dans l'atlas au conditionnel, d'où la fiabilité basse du fait.",
      },
      {
        title: "SIL Ethnologue — Taabwa (tap)",
        url: "https://www.ethnologue.com/language/tap/",
        tier: "official",
      },
    ],
  },
  {
    id: "angolar-naufrage",
    headline:
      "Les Angolares de São Tomé portent le nom du pays d'où leurs ancêtres n'ont pas achevé le voyage.",
    body: [
      "La tradition rapporte qu'un navire négrier fit naufrage au large des côtes sud de l'île vers 1540, et que les survivants fondèrent une communauté marronne dans les forêts de l'intérieur. L'ethnonyme renvoie directement à l'Angola, région d'origine de la plupart de leurs ancêtres.",
      "Le nom est donc un point de départ transformé en identité — et il est régulièrement mal employé : on le donne à tous les créolophones de l'île, alors qu'il désigne cette communauté précise, historiquement stigmatisée comme le bas de l'échelle sociale santoméenne.",
    ],
    entities: [
      { kind: "people", id: "PPL_ANGOLAR", label: "Angolares" },
      { kind: "country", id: "STP", label: "São Tomé-et-Príncipe" },
    ],
    tier: "referenced",
    sources: [
      {
        title:
          "Bouyer et al. — The Genes of Freedom: Genome-Wide Insights into Marronage (2021)",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8229774/",
        tier: "referenced",
        notes:
          "Étude génomique de la communauté angolar, qui discute le récit du naufrage et l'origine angolaise des ancêtres.",
      },
      {
        title: "SIL Ethnologue — Angolar (aoa)",
        url: "https://www.ethnologue.com/language/aoa/",
        tier: "official",
      },
    ],
  },
  {
    id: "crioulo-cap-vert",
    headline:
      "Au Cap-Vert, un mot qui désignait l'esclave né dans la colonie est devenu le nom de la nation.",
    body: [
      "Le portugais crioulo nommait d'abord les esclaves africains nés dans les colonies, puis les personnes de descendance mixte. C'était une catégorie de statut, produite par le système qui la nommait.",
      "Sur l'archipel, il s'est étendu à toute la population et a cessé d'être discriminant : il est devenu le marqueur d'une identité nationale inclusive, et le nom de la langue que le pays parle. Peu de mots ont changé de camp aussi complètement.",
    ],
    entities: [
      { kind: "people", id: "PPL_CREOLE_CABOVERDIEN", label: "Cap-Verdiens" },
      { kind: "country", id: "CPV", label: "Cap-Vert" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Cape Verdean Creole (kea)",
        url: "https://www.ethnologue.com/language/kea/",
        tier: "official",
        notes:
          "Atteste le kabuverdianu comme langue de l'archipel et ses appellations.",
      },
      {
        title: "JSTOR Daily — Cape Verde's Dilemma(s)",
        url: "https://daily.jstor.org/cape-verdes-dilemmas/",
        tier: "referenced",
        notes:
          "Revient sur l'enjeu politique du rattachement identitaire au moment de l'indépendance.",
      },
    ],
  },
  // ——————————————————————————————————————————————————————————————————————
  // Les noms que le lieu a donnés
  // ——————————————————————————————————————————————————————————————————————
  {
    id: "kavango-riviere",
    headline: "Les vaKavango portent le nom de la rivière qui les sépare.",
    body: [
      "L'Okavango marque la frontière naturelle entre la Namibie et l'Angola dans cette région. Le peuple riverain en a pris le nom, et la région administrative namibienne — coupée en Kavango Est et Kavango Ouest en 2013 — a pris le sien.",
      "Le mot a donc fait trois fois le tour : de l'eau au peuple, du peuple à la province, et de la province à l'état civil de ceux qui y vivent. Une frontière tracée par un fleuve finit par nommer les gens des deux rives.",
    ],
    entities: [
      { kind: "people", id: "PPL_KAVANGO", label: "vaKavango" },
      { kind: "country", id: "NAM", label: "Namibie" },
      { kind: "country", id: "AGO", label: "Angola" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Kwangali (kwn)",
        url: "https://www.ethnologue.com/language/kwn/",
        tier: "official",
        notes:
          "Atteste la langue et la localisation riveraine. Le rapport de nom entre la rivière, le peuple et la région est rapporté par la notice de ce peuple dans l'atlas.",
      },
    ],
  },
  {
    id: "kaonde-riviere",
    headline:
      "Le nom des Kaonde leur a été donné par le chef qui venait de les vaincre.",
    body: [
      "La tradition rapporte que le chef lunda Musokantanda, après avoir défait le chef Mushima, le surnomma Mushima wa Kaonde — Mushima de la rivière Kaonde, un affluent de la Mukwizhi. Le vaincu a hérité du nom du cours d'eau où il se trouvait.",
      "Une étymologie populaire tire par ailleurs Kaonde vers « le mince » ou « le petit nombre », en référence à cette même défaite. Deux lectures, une seule direction : dans les deux cas, le nom est écrit par le vainqueur.",
    ],
    entities: [
      { kind: "people", id: "PPL_KAONDE", label: "Kaonde" },
      { kind: "country", id: "ZMB", label: "Zambie" },
      { kind: "country", id: "COD", label: "République démocratique du Congo" },
    ],
    tier: "unverified",
    sources: [
      {
        title: "Kaonde — DICE Database, University of Missouri",
        url: "https://dice.missouri.edu/assets/docs/niger-congo/Kaonde.pdf",
        tier: "referenced",
        notes:
          "Fiche linguistique sur le kaonde. Les deux récits d'origine sont traditionnels et rapportés par la notice de ce peuple dans l'atlas, sans source qui les arbitre : d'où la fiabilité basse du fait.",
      },
    ],
  },
  {
    id: "manianga-marche",
    headline:
      "Les Manianga s'appellent peut-être d'après un marché, ou d'après un mot lâché par Stanley.",
    body: [
      "Manianga n'était pas un ethnonyme. Selon Van Bulck, c'est le nom d'un marché fondé près de Kimbanza par l'ancêtre Volumina, seul marché de la région à subsister à l'époque coloniale. Selon Monnier et Wiliame, c'est un surnom lancé par Stanley et sa suite en 1881 près des chutes de Mpioka, appliqué à un peuple qui s'appelait Sundi.",
      "Les deux versions racontent la même chose : un mot de circonstance, ramassé par l'écrit colonial, devenu le nom d'un groupe. Ba-sundi reste l'appellation ethnique propre — Ba- étant le préfixe bantou du pluriel des humains.",
    ],
    entities: [
      { kind: "people", id: "PPL_MANIANGA", label: "Manianga (Ba-sundi)" },
      { kind: "country", id: "COD", label: "République démocratique du Congo" },
      { kind: "country", id: "COG", label: "Congo" },
    ],
    tier: "unverified",
    sources: [
      {
        title: "SIL Ethnologue — Kikongo (kon)",
        url: "https://www.ethnologue.com/language/kon",
        tier: "official",
        notes:
          "Atteste la langue et le rattachement kongo. Les deux hypothèses sur l'origine du nom sont rapportées par la notice de ce peuple dans l'atlas d'après Van Bulck d'une part, Monnier et Wiliame d'autre part, sans arbitrage.",
      },
    ],
  },
  {
    id: "gorowa-village-voisin",
    headline:
      "Les Gorwaa sont désignés par le nom du plus gros village de leurs voisins.",
    body: [
      "Kimbulu — ou Mbulu — est emprunté au principal village iraqw. Les exonymes swahilis Fiome et Ufiomi circulent en parallèle, et les Datooga, éleveurs voisins, les appellent Gobreik, mot qui désigne les anciens groupes couchitiques agriculteurs dont Gorwaa et Iraqw descendent.",
      "L'affaire n'est pas historique. En ville, beaucoup de jeunes Gorwaa se disent eux-mêmes Mbulu, et l'étiquette absorbe progressivement les deux groupes en un seul. Un nom emprunté au voisin finit par effacer la distinction qu'il servait à marquer.",
    ],
    entities: [
      { kind: "people", id: "PPL_GOROWA", label: "Gorwaa" },
      { kind: "country", id: "TZA", label: "Tanzanie" },
    ],
    tier: "referenced",
    sources: [
      {
        title:
          "Harvey, Andrew — Gorwaa (Tanzania), Language Documentation and Description",
        url: "https://www.lddjournal.org/article/1200/galley/2445/download/",
        tier: "referenced",
        notes:
          "Documentation de terrain qui relève les appellations concurrentes et le glissement urbain vers Mbulu.",
      },
      {
        title: "SIL Ethnologue — Gorwaa (gow)",
        url: "https://www.ethnologue.com/language/gow/",
        tier: "official",
      },
    ],
  },
  {
    id: "kalabari-calabar",
    headline:
      "Kalabari et Calabar sonnent pareil et n'ont rien en commun : les Européens ont confondu les deux.",
    body: [
      "Kalabari vient d'un ancêtre éponyme, Perebo Kalabari, fils de Meinowei. Calabar est un nom efik, celui d'une ville du Cross River. Les Portugais, arrivés sur la côte, ont écrit Calabari sous l'influence du voisinage ; les Britanniques ont prononcé Calabar. Deux toponymes sans parenté ont fusionné dans l'oreille des arrivants.",
      "Le peuple, lui, se nomme Awome. Et le nom du lieu principal, Elem Kalabari, dit « nouveau port d'expédition » — c'est-à-dire ce que le commerce en avait fait.",
    ],
    entities: [
      { kind: "people", id: "PPL_KALAIBARI", label: "Kalabari" },
      { kind: "country", id: "NGA", label: "Nigeria" },
    ],
    tier: "referenced",
    sources: [
      {
        title:
          "Alagoa, E. J. — A History of the Niger Delta. Onyoma Research Publications, 2009",
        tier: "referenced",
        notes:
          "L'histoire de référence du delta du Niger, et la source de la distinction entre Kalabari et Calabar.",
      },
      {
        title: "SIL Ethnologue — Kalabari (ijn)",
        url: "https://www.ethnologue.com/language/ijn/",
        tier: "official",
      },
    ],
  },
  // ——————————————————————————————————————————————————————————————————————
  // Les noms que les savants ont donnés
  // ——————————————————————————————————————————————————————————————————————
  {
    id: "omotique-fleuve-omo",
    headline:
      "Une famille de langues d'Éthiopie a été rebaptisée en 1969 d'après un fleuve, pour cesser de dire « couchitique occidental ».",
    body: [
      "Jusqu'à Greenberg, en 1963, ces langues du sud-ouest éthiopien sont classées comme une branche occidentale du couchitique. Harold C. Fleming propose en 1969 de les tenir pour une branche indépendante de l'afro-asiatique, et de les appeler omotiques — du nom de l'Omo, le fleuve au bord duquel vivent la plupart de ces peuples. Les travaux de Bender, en 1971, font accepter la proposition.",
      "Le mot ne désigne aucune identité partagée : Bench, Dizi, Kafa, Wolaita, Gamo, Hamer ne se pensent pas omotiques. Et l'unité de la famille est contestée — pour certains linguistes, les langues mao et sud-omotiques n'appartiennent même pas à l'afro-asiatique. Une catégorie savante peut se renommer une fois et rester discutée un demi-siècle.",
    ],
    entities: [
      {
        kind: "people",
        id: "PPL_OMOTIQUE_MACRO",
        label: "Peuples omotiques",
      },
      { kind: "family", id: "FLG_OMOTIQUE", label: "Langues omotiques" },
      { kind: "country", id: "ETH", label: "Éthiopie" },
    ],
    tier: "referenced",
    sources: [
      {
        title:
          "Bender, M. Lionel — Omotic: A New Afroasiatic Language Family. Southern Illinois University, 1975",
        tier: "referenced",
        notes:
          "L'ouvrage qui installe la famille omotique comme branche indépendante, après la proposition de Fleming.",
      },
      {
        title:
          "The Cambridge Handbook of Linguistic Typology — The Omotic Language Family",
        url: "https://www.cambridge.org/core/books/cambridge-handbook-of-linguistic-typology/omotic-language-family/376C86AD112F0E4C5F5677AE4F3DB5FA",
        tier: "referenced",
        notes:
          "État de la question, y compris les contestations de l'unité interne de la famille.",
      },
    ],
  },
  {
    id: "gur-mabia",
    headline:
      "Les langues gur ont changé trois fois de nom, et la dernière proposition vient de l'intérieur.",
    body: [
      "Koelle les range en 1854 dans son « North-Eastern High Sudan ». Elles deviennent ensuite les langues voltaïques, du nom du fleuve Volta, puis gur. Aucun de ces noms ne vient des peuples concernés : ils n'ont d'ailleurs pas de sentiment d'appartenance commune, la famille étant une catégorie de linguistes.",
      "En 2017, le linguiste Adams Bodomo propose Mabia pour l'ensemble du gur central : du proto-gur ma-, mère, et bia, enfant. Le nom dit une parenté au lieu de dire un fleuve, et il est proposé par quelqu'un dont c'est la langue. C'est rare assez pour être noté.",
    ],
    entities: [
      { kind: "people", id: "PPL_GUR_MACRO", label: "Peuples gur" },
      { kind: "family", id: "FLG_GUR", label: "Langues gur" },
      { kind: "country", id: "BFA", label: "Burkina Faso" },
      { kind: "country", id: "GHA", label: "Ghana" },
    ],
    tier: "referenced",
    sources: [
      {
        title:
          "Bodomo, Adams — Mabia: its etymological genesis, geographical spread, and some salient genetic features, 2017",
        tier: "referenced",
        notes:
          "La proposition de renommer Mabia le gur central, et l'argument étymologique ma- + bia.",
      },
      {
        title:
          "Kleinewillinghöfer, Ulrich — Gur-Adamawa relationship, Journal of West African Languages, 2014",
        tier: "referenced",
        notes:
          "Situe la famille gur et la fragilité de ses contours, dont l'appellation dépend.",
      },
    ],
  },
  {
    id: "ronga-junod",
    headline:
      "L'ethnonyme ronga a été mis en circulation par un philologue suisse.",
    body: [
      "Henri-Alexandre Junod, missionnaire et linguiste, est le premier à étudier la langue à la fin du XIXᵉ siècle, et c'est son usage qui fixe le terme dans la littérature européenne. Le mot n'était pas inventé : les sources portugaises du XVIᵉ siècle mentionnaient déjà des chefferies rhonga autour de la baie de Delagoa, l'actuelle baie de Maputo.",
      "Ce que le savant fixe, il le fixe aussi contre autre chose. Les recensements mozambicains et sud-africains ont ensuite rangé les Ronga sous Tsonga ou sous Shangaan, et la question de savoir si le xironga est une langue ou un dialecte du xitsonga n'est toujours pas close.",
    ],
    entities: [
      { kind: "people", id: "PPL_RONGA", label: "Ronga" },
      { kind: "country", id: "MOZ", label: "Mozambique" },
    ],
    tier: "referenced",
    sources: [
      {
        title:
          "Junod, Henri-Alexandre — The Life of a South African Tribe, 1912-1913",
        tier: "referenced",
        notes:
          "L'ethnographie qui installe le vocabulaire dont la littérature ultérieure hérite.",
      },
      {
        title: "SIL Ethnologue — Ronga (rng)",
        url: "https://www.ethnologue.com/language/rng/",
        tier: "official",
        notes: "Atteste le xironga comme langue et ses appellations voisines.",
      },
    ],
  },
  // ——————————————————————————————————————————————————————————————————————
  // Les noms réfractés par les langues d'Europe
  // ——————————————————————————————————————————————————————————————————————
  {
    id: "fulbe-quatre-noms",
    headline:
      "Les Fulbe portent quatre noms internationaux, et aucun des quatre n'est le leur.",
    body: [
      "Peul vient du wolof Pel, repris par les colonisateurs français. Fula est l'anglicisation d'un terme mandingue. Fulani est la forme haoussa, devenue courante au Nigeria et dans tout le monde anglophone. Fellata est le terme arabe du Soudan et du Tchad, appliqué à ceux installés sur les routes du pèlerinage — et il est chargé de stéréotypes assez négatifs pour qu'on l'évite.",
      "Le nom du peuple, en peul, est Fulbe au pluriel et Pullo au singulier. Quatre langues voisines ont chacune fabriqué sa propre étiquette, et ce sont ces quatre-là qui ont voyagé.",
    ],
    entities: [
      {
        kind: "people",
        id: "PPL_FULANI_MASSINA",
        label: "Fulbe du Massina",
      },
      { kind: "country", id: "MLI", label: "Mali" },
      { kind: "country", id: "BFA", label: "Burkina Faso" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Fulfulde, Maasina (ffm)",
        url: "https://www.ethnologue.com/language/ffm/",
        tier: "official",
        notes:
          "Atteste les appellations Peul, Fula, Fulani et Fulbe pour la même langue.",
      },
      {
        title: "Seydou, Christiane — La poésie pastorale peule. Karthala, 1977",
        tier: "referenced",
        notes:
          "Travail de référence sur la langue et la tradition orale peules, et sur ce que le peuple nomme lui-même.",
      },
    ],
  },
  {
    id: "malinke-manden",
    headline:
      "Malinké, Mandinka, Mandingo, Maninka : un seul nom, réfracté par les routes de la dispersion.",
    body: [
      "Tous viennent du Manden, la région historique berceau de l'empire du Mali. Malinké en est la forme française, Maninka celle de Guinée et du Mali, Mandinka celle du Sénégal, de la Gambie et de la Guinée-Bissau, Mandingo la version anglaise coloniale encore employée en Gambie et en Sierra Leone.",
      "Chaque forme marque une route de dispersion et l'administration qui l'a écrite. Quinze millions de personnes environ sont concernées, et l'ISO 639-3 a fini par découper l'ensemble en une demi-douzaine de langues séparées — parce qu'un nom qui se dit de six façons finit par être classé six fois.",
    ],
    entities: [
      { kind: "people", id: "PPL_MALINKE", label: "Malinké" },
      { kind: "country", id: "MLI", label: "Mali" },
      { kind: "country", id: "GIN", label: "Guinée" },
      { kind: "country", id: "SEN", label: "Sénégal" },
      { kind: "country", id: "GMB", label: "Gambie" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — macrolangue mandingue (man)",
        url: "https://www.ethnologue.com/language/man/",
        tier: "official",
        notes:
          "Atteste les formes concurrentes et le découpage en langues distinctes par l'ISO 639-3.",
      },
    ],
  },
  {
    id: "fang-reputation",
    headline:
      "Les Fang ont laissé courir une réputation de cannibales pour tenir les étrangers à distance.",
    body: [
      "Pahouin est l'étiquette française, Pangwe l'allemande, Pamue l'espagnole : trois empires, trois orthographes, un seul peuple, qui se nomme Fang. Le terme Pahouin est aujourd'hui tenu pour péjoratif.",
      "Il l'est notamment parce qu'il s'est chargé d'une réputation de guerriers cannibales — que les Fang, rapporte la notice de ce peuple, ont eux-mêmes cultivée pour dissuader les visiteurs. Un peuple peut donc contribuer à sa propre légende noire, et découvrir ensuite qu'elle lui survit et le dessert.",
    ],
    entities: [
      { kind: "people", id: "PPL_FANG_GABON", label: "Fang" },
      { kind: "country", id: "GAB", label: "Gabon" },
      { kind: "country", id: "GNQ", label: "Guinée équatoriale" },
      { kind: "country", id: "CMR", label: "Cameroun" },
    ],
    tier: "unverified",
    sources: [
      {
        title: "SIL Ethnologue — Fang (fan)",
        url: "https://www.ethnologue.com/language/fan/",
        tier: "official",
        notes: "Atteste l'ethnonyme et les étiquettes coloniales concurrentes.",
      },
      {
        title: "Smarthistory — Fang reliquary guardian figure",
        url: "https://smarthistory.org/fang-reliquary-figure/",
        tier: "referenced",
        notes:
          "Contexte sur les Fang et leur art. La culture délibérée de la réputation est rapportée par la notice de ce peuple dans l'atlas sans source dédiée, d'où la fiabilité basse du fait.",
      },
    ],
  },
  {
    id: "beti-cranes",
    headline:
      "L'accusation de cannibalisme portée contre les Béti reposait sur des crânes d'ancêtres.",
    body: [
      "Paul Du Chaillu, en 1856, observe des crânes près des villages et conclut à l'anthropophagie. C'étaient des crânes d'ancêtres, conservés comme tels. L'erreur de lecture a été reprise, imprimée, et a servi à justifier la violence coloniale.",
      "Le mot qui l'a portée est Pahouin, déformation française du Pangwe allemand, étiquette administrative qui amalgamait Ewondo, Bulu, Fang, Eton et Bane sous un seul nom. Une catégorie fausse et une calomnie fausse ont voyagé ensemble, et l'une a rendu l'autre plus facile à croire.",
    ],
    entities: [
      { kind: "people", id: "PPL_BETI", label: "Béti" },
      { kind: "country", id: "CMR", label: "Cameroun" },
      { kind: "country", id: "GNQ", label: "Guinée équatoriale" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Ewondo (ewo)",
        url: "https://www.ethnologue.com/language/ewo/",
        tier: "official",
        notes:
          "Atteste l'une des langues rassemblées sous l'étiquette Beti-Pahouin.",
      },
      {
        title: "SIL Ethnologue — Fang (fan)",
        url: "https://www.ethnologue.com/language/fan/",
        tier: "official",
        notes:
          "Atteste l'autre. L'épisode Du Chaillu et la nature des crânes sont rapportés par la notice de ce peuple dans l'atlas.",
      },
    ],
  },
  // ——————————————————————————————————————————————————————————————————————
  // Les noms que ceux qui les portent ont repris
  // ——————————————————————————————————————————————————————————————————————
  {
    id: "khwe-penduka",
    headline:
      "En 2000, à Penduka, des peuples se sont réunis pour décider comment leur nom s'écrit.",
    body: [
      "Les Khwe du Kalahari et de l'Okavango étaient nommés Kxoe, Hukwe, Xun, Barakwena, Mbarakwena selon la source — et « Water Bushmen » dans les documents coloniaux, du fait de leur habitat riverain. Plusieurs de ces formes sont dépréciatives ; le mot Bushmen est aujourd'hui largement rejeté.",
      "La déclaration de Penduka, en 2000, recommande une orthographe standardisée : Khwe. C'est le geste inverse de tout le reste de cette page — non pas un nom reçu, mais un nom arrêté par ceux qui le portent, à une date qu'on peut citer.",
    ],
    entities: [
      { kind: "people", id: "PPL_KXOE", label: "Khwe" },
      { kind: "country", id: "BWA", label: "Botswana" },
      { kind: "country", id: "NAM", label: "Namibie" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "Glottolog — Kxoe (kxoe1243, ISO 639-3 : xuu)",
        url: "https://glottolog.org/resource/languoid/id/kxoe1243",
        tier: "official",
        notes: "Atteste la langue et les appellations concurrentes.",
      },
      {
        title:
          "Kilian-Hatz, Christa — Khwe Dictionary. Rüdiger Köppe Verlag, 2003",
        tier: "referenced",
        notes:
          "Le dictionnaire de référence, publié sous l'orthographe recommandée par la déclaration de Penduka.",
      },
    ],
  },
  {
    id: "west-taa-masarwa",
    headline:
      "Les !Xoon s'appellent « les gens de l'ouest », et leurs voisins les appellent Masarwa.",
    body: [
      "ǃama ʘʔâni, en taa, dit la direction : les gens de l'ouest. Masarwa est le mot tswana, généralement tenu pour péjoratif ; Magong en est une variante régionale. L'étiquette West Taa, elle, est venue des linguistes, pour distinguer ce parler du !Xoon oriental documenté par Anthony Traill.",
      "Trois registres se superposent donc sur les mêmes personnes : ce qu'elles se disent, ce que le voisin en dit, ce que la science en note. Aucun des trois n'est traduisible dans les deux autres, et c'est le troisième qui figure dans les catalogues.",
    ],
    entities: [
      { kind: "people", id: "PPL_WEST_TAA", label: "!Xoon occidental" },
      { kind: "country", id: "BWA", label: "Botswana" },
      { kind: "country", id: "NAM", label: "Namibie" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Taa (nmn)",
        url: "https://www.ethnologue.com/language/nmn/",
        tier: "official",
        notes: "Atteste la langue, l'autonyme !Xoon et l'exonyme Masarwa.",
      },
      {
        title: "Glottolog — West !Xoon (xooo1239)",
        url: "https://glottolog.org/resource/languoid/id/xooo1239",
        tier: "official",
      },
    ],
  },
  {
    id: "antambahoaka-surnom",
    headline:
      "Les Antambahoaka de Madagascar portent la déformation d'un surnom : « aimé de son peuple ».",
    body: [
      "Ratiambahoaka était le surnom du fondateur Ravalarivo. Le groupe qui s'est constitué autour de lui a pris le mot, usé par l'usage, pour nom collectif.",
      "En interne, un autre nom circule : Zafiraminia, « fils de Raminia », réservé aux membres initiés après la circoncision — le sambatra. Un peuple peut ainsi porter deux noms qui ne s'adressent pas au même public.",
    ],
    entities: [
      { kind: "people", id: "PPL_ANTAMBAHOAKA", label: "Antambahoaka" },
      { kind: "country", id: "MDG", label: "Madagascar" },
    ],
    tier: "unverified",
    sources: [
      {
        title: "SIL Ethnologue — malgache (mlg)",
        url: "https://www.ethnologue.com/language/mlg/",
        tier: "official",
        notes:
          "Atteste la macrolangue et ses variétés. L'étymologie du nom est une tradition rapportée par la notice de ce peuple dans l'atlas, sans source qui l'atteste : d'où la fiabilité basse du fait.",
      },
    ],
  },
  {
    id: "masa-banana",
    headline:
      "Tous les noms donnés par les voisins ne blessent pas : « Banana » veut dire amical.",
    body: [
      "C'est l'exonyme des Masa dans plusieurs langues voisines, et il vient de leur réputation d'hospitalité. Yagoua, autre appellation courante, est simplement le nom de leur ville principale au Cameroun.",
      "Le contraste rend le reste lisible. Les mêmes Masa sont aussi appelés Kirdi — « païen » —, mot qu'ils rejettent. Un peuple reçoit des noms de plusieurs voisins à la fois, et ce sont les rapports de force, pas la langue, qui décident lequel s'imprime.",
    ],
    entities: [
      { kind: "people", id: "PPL_MASA", label: "Masa" },
      { kind: "country", id: "TCD", label: "Tchad" },
      { kind: "country", id: "CMR", label: "Cameroun" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Masana (mcn)",
        url: "https://www.ethnologue.com/language/mcn/",
        tier: "official",
        notes:
          "Atteste l'endonyme Masana et les appellations Massa, Banana et Yagoua.",
      },
    ],
  },
  {
    id: "rendille-baton",
    headline:
      "Les Rendille se disent « porteurs du bâton de Dieu ». Les Somali les appellent « ceux qui ont refusé ».",
    body: [
      "L'ethnonyme rendille est traduit par une référence à un bâton sacré de chef. Le mot somali Rertit — Reer Til, les rejetés — dit tout autre chose : ceux qui ont refusé le territoire somali et sont restés à Marsabit.",
      "Les Somali poussent la distinction plus loin encore, en séparant les « vrais » Rendille, dits asil, de ceux qui parlent samburu et sont tenus pour assimilés. Nommer son voisin, ici, revient à trancher ce qu'il aurait dû être.",
    ],
    entities: [
      { kind: "people", id: "PPL_RENDILLE", label: "Rendille" },
      { kind: "country", id: "KEN", label: "Kenya" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Rendille (rel)",
        url: "https://www.ethnologue.com/language/rel/",
        tier: "official",
        notes: "Atteste la langue et les appellations voisines.",
      },
      {
        title:
          "Schlee, Günther — Identities on the Move: Clanship and Pastoralism in Northern Kenya. Manchester University Press, 1989",
        tier: "referenced",
        notes:
          "L'étude de référence sur les identités et les appartenances claniques dans le nord du Kenya.",
      },
    ],
  },
  // ——————————————————————————————————————————————————————————————————————
  // Les noms dont l'étymologie célèbre ne tient pas
  // ——————————————————————————————————————————————————————————————————————
  {
    id: "kaffa-cafe",
    headline:
      "Non, le mot « café » ne vient probablement pas du royaume de Kaffa.",
    body: [
      "L'hypothèse est trop belle pour ne pas circuler : le caféier pousse dans cette région d'Éthiopie, le royaume s'appelle Kaffa, donc le mot en viendrait. Les linguistes la jugent peu probable, et la littérature la rapporte comme une hypothèse, pas comme un fait.",
      "Ce que Kaffa nomme réellement est déjà triple : un peuple — qui se dit Kafficho —, un royaume historique, et une zone administrative éthiopienne actuelle. Keffa en est la translittération amharique. Trois choses sous un mot suffisent ; la quatrième était de trop.",
    ],
    entities: [
      { kind: "people", id: "PPL_KAFFA", label: "Kafficho" },
      { kind: "country", id: "ETH", label: "Éthiopie" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "Glottolog — Kafa (kafa1242)",
        url: "https://glottolog.org/resource/languoid/id/kafa1242",
        tier: "official",
        notes:
          "Atteste la langue et l'autonyme. Le caractère peu probable de l'étymologie du mot café est rapporté par la notice de ce peuple dans l'atlas d'après la littérature linguistique.",
      },
      {
        title: "Pankhurst, Richard — The Ethiopian Borderlands, 1997",
        tier: "referenced",
        notes:
          "Histoire des marches éthiopiennes, dont le royaume de Kaffa et son incorporation.",
      },
    ],
  },
  {
    id: "bono-brong-ahafo",
    headline:
      "Un exonyme est devenu, en 1959, le nom officiel d'une région du Ghana.",
    body: [
      "Les Bono se nomment Bono, ou Bonofoɔ — « les pionniers », « les premiers-nés de la terre ». Brong est la forme que les Asante et les Gonja employaient pour désigner les peuples de la zone située entre les Asante et le Volta, et que les administrateurs britanniques ont reprise. En Côte d'Ivoire, la même population est dite Abron.",
      "En 1959, l'exonyme entre dans la géographie officielle avec la région Brong-Ahafo, qui amalgame des peuples d'origines différentes. Le pays l'a depuis scindée en Bono, Bono Est et Ahafo : il aura fallu soixante ans pour que le nom que le peuple se donne revienne sur la carte.",
    ],
    entities: [
      { kind: "people", id: "PPL_BONO", label: "Bono" },
      { kind: "people", id: "PPL_BRONG", label: "Brong (Abron)" },
      { kind: "country", id: "GHA", label: "Ghana" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Abron (abr)",
        url: "https://www.ethnologue.com/language/abr/",
        tier: "official",
        notes: "Atteste les formes Bono, Brong et Abron pour la même langue.",
      },
      {
        title:
          "Stahl, Ann Brower — Making History in Banda: Anthropological Visions of Africa's Past. Cambridge University Press, 2001",
        tier: "referenced",
        notes:
          "Archéologie et histoire de la zone, et de ce que les découpages régionaux y ont recouvert.",
      },
    ],
  },
  {
    id: "toura-wen",
    headline:
      "Chez les Toura, le nom colonial est resté officiel et le nom propre est resté domestique.",
    body: [
      "Toura est la forme adoptée par l'administration coloniale française ; elle reste en usage officiel en Côte d'Ivoire, et Tura en est la variante anglophone. Wen, ou Wenmebo, est l'endonyme.",
      "Le partage est net et il est banal : l'un des deux noms figure sur les papiers, l'autre se parle à la maison. La douzaine d'autres appellations relevées — Gwane, Nebou, Yaramassa — sont des noms de sous-groupes que le nom unique a effacés.",
    ],
    entities: [
      { kind: "people", id: "PPL_TOURA", label: "Toura (Wen)" },
      { kind: "country", id: "CIV", label: "Côte d'Ivoire" },
      { kind: "country", id: "GIN", label: "Guinée" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "Glottolog — Dan-Toura (dant1235)",
        url: "https://glottolog.org/resource/languoid/id/dant1235",
        tier: "official",
        notes:
          "Atteste le rattachement de la langue et les appellations concurrentes.",
      },
    ],
  },
  {
    id: "bantu-knots",
    headline:
      "L'origine zouloue des « Bantu knots » est répétée partout, mais aucune source ne l'établit.",
    body: [
      "En zoulou, « abantu » veut simplement dire « les gens ». En 1862, le linguiste Wilhelm Bleek en fait une catégorie savante pour classer des langues apparentées — cette classification n'a aucun rapport avec la coiffure.",
      "Qui a nommé cette coiffure « Bantu knots », et quand ? Aucune source consultée ne l'établit. L'attribution à un « royaume zoulou », largement reprise, remonte à une chaîne de citations qui se referme sur elle-même sans attestation historique indépendante. Ce qui est documenté, en revanche, c'est une pratique familiale bien réelle : celle que raconte l'artiste sud-africaine Zizipho Poswa, transmise par sa tante.",
    ],
    entities: [
      { kind: "family", id: "FLG_BANTU", label: "Langues bantoues" },
      { kind: "people", id: "PPL_ZULU", label: "Zoulou" },
      { kind: "people", id: "PPL_XHOSA", label: "Xhosa" },
      { kind: "country", id: "ZAF", label: "Afrique du Sud" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "South African History Online — « Defining the term Bantu »",
        url: "https://sahistory.org.za/article/defining-term-bantu",
        tier: "referenced",
        notes:
          "Histoire du mot « Bantu » et de sa racine linguistique — pas de la coiffure.",
      },
      {
        title:
          "Herbert & Bailey — The Bantu languages: sociohistorical perspectives, 2002",
        url: "https://www.cambridge.org/core/books/abs/language-in-south-africa/bantu-languages-sociohistorical-perspectives/02CCE08E10611E69474FC93EDCC574B9",
        tier: "referenced",
        notes: "Classification de Bleek, 1857/1858 puis 1862.",
      },
      {
        title:
          "The Metropolitan Museum of Art — interview de l'artiste Zizipho Poswa, 2022",
        url: "https://www.metmuseum.org/perspectives/afpr-zizipho-poswa-interview",
        tier: "referenced",
        notes:
          "Pratique familiale contemporaine documentée — pas une preuve d'invention première ni de date d'origine.",
      },
      {
        title: "Mifetu & Trippeer — Bantu Knots, ITAA 2024 proceedings",
        url: "https://www.iastatedigitalpress.com/itaa/article/18849/galley/16728/view/",
        tier: "unverified",
        notes:
          "Attribue l'origine zouloue à Simeon (2022) sans fournir d'attestation historique indépendante — la chaîne de citation remonte à une source sur le mot « Bantu », pas sur la coiffure.",
      },
    ],
  },
];

function hasOfficialSource(fact: DidYouKnowFact): boolean {
  return fact.sources?.some((source) => source.tier === "official") ?? false;
}

/**
 * Draw one fact for this request.
 *
 * The home only publishes entries that name an official source. A bank with
 * no such entry renders no fact rather than silently widening the evidence
 * boundary. `random` is injected so tests stay deterministic without the
 * band losing its variation in production.
 */
// @req REQ-113
export function pickDidYouKnowFact(
  random: () => number = Math.random,
  facts: DidYouKnowFact[] = DID_YOU_KNOW_FACTS
): DidYouKnowFact | null {
  const eligible = facts.filter(hasOfficialSource);
  if (eligible.length === 0) return null;
  const index = Math.min(
    eligible.length - 1,
    Math.floor(random() * eligible.length)
  );
  return eligible[index];
}

/**
 * Draw distinct, officially sourced facts for the home-page preview.
 *
 * Shuffling once rather than rolling once per card makes duplication
 * impossible and keeps the operation proportional to the small editorial
 * bank. When fewer entries qualify, the section tells every supported story
 * instead of filling the remaining slot with a weaker claim.
 */
// @req REQ-113
export function pickDidYouKnowFacts(
  count = 2,
  random: () => number = Math.random,
  facts: DidYouKnowFact[] = DID_YOU_KNOW_FACTS
): DidYouKnowFact[] {
  if (count <= 0) return [];
  return shuffleDidYouKnowDeck(random, facts.filter(hasOfficialSource)).slice(
    0,
    count
  );
}

/**
 * The bank in a drawn order, every fact once before any fact twice.
 *
 * The anecdotes page reads one card at a time, so the draw has to be a
 * shuffled deck rather than a roll of the dice: drawing independently each
 * time a reader presses « Suivant » hands them the same anecdote twice
 * within a handful of turns, and a reader who sees a repeat concludes the
 * bank is smaller than it is. Exhausting a permutation guarantees the
 * twenty-fourth press shows the twenty-fourth fact.
 *
 * `avoidLeading` covers the seam between two permutations — without it, the
 * last card of one deck can be the first card of the next, which is the one
 * repeat a reader is certain to notice.
 */
// @req REQ-113
export function shuffleDidYouKnowDeck(
  random: () => number = Math.random,
  facts: DidYouKnowFact[] = DID_YOU_KNOW_FACTS,
  avoidLeading: string | null = null
): DidYouKnowFact[] {
  const byId = new Map(facts.map((fact) => [fact.id, fact]));

  return shuffleAnecdoteOrder(
    facts.map((fact) => fact.id),
    random,
    avoidLeading
  ).map((id) => byId.get(id) as DidYouKnowFact);
}

/**
 * The fact a shared URL names, or null when it names one the bank dropped.
 *
 * A link a reader posted last month has to survive the anecdote being
 * renamed or retired; the page falls back to a fresh draw rather than to a
 * 404, because the address still points at a page that has something to say.
 */
// @req REQ-113
export function findDidYouKnowFact(
  factId: string | null | undefined,
  facts: DidYouKnowFact[] = DID_YOU_KNOW_FACTS
): DidYouKnowFact | null {
  if (!factId) return null;
  return facts.find((fact) => fact.id === factId) ?? null;
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
  const eligible = facts.filter(
    (entry) => entry.id !== previousId && hasOfficialSource(entry)
  );
  return pickDidYouKnowFact(random, eligible.length > 0 ? eligible : facts);
}
