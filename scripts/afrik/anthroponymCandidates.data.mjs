/**
 * Per-country anthroponym candidates, authored outside the corpus.
 *
 * Entry shape: [name, nameSystem, peopleIds, variants, note?]
 *
 * `nameSystem` uses the five values of the `name_system_type` enum (migration
 * 053 / DEC-039). Where a naming tradition does not map cleanly onto one of the
 * five — Akan day-names, Malagasy compound names, Arabic given-name chains —
 * the closest value is used and the country's `onomasticNote` records the
 * mismatch, so the reviewer sees the classification is provisional rather than
 * settled.
 *
 * `verificationLead` names the kind of source to consult per country. It is
 * never a URL: a fabricated citation would be worse than a research direction.
 */

export const COUNTRY_CANDIDATES = {
  // ===========================================================================
  // Afrique de l'Ouest
  // ===========================================================================
  SEN: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Le sant (Wolof) et le yettoode (Haalpulaar) sont des noms de clan patrilinéaires, " +
      "adossés à un système de parenté à plaisanterie (kal) entre patronymes.",
    verificationLead:
      "Registre national des électeurs, annuaires ANSD, travaux d'onomastique wolof et sérère",
    names: [
      ["Diop", "clan_name", ["PPL_WOLOF"], ["Jóob"]],
      ["Ndiaye", "clan_name", ["PPL_WOLOF"], ["Njaay"]],
      ["Fall", "clan_name", ["PPL_WOLOF"], ["Faal"]],
      ["Gueye", "clan_name", ["PPL_WOLOF"], ["Géey"]],
      ["Sarr", "clan_name", ["PPL_SERER"], ["Saar"]],
      ["Faye", "clan_name", ["PPL_SERER"], ["Fay"]],
      ["Diouf", "clan_name", ["PPL_SERER"], ["Juuf"]],
      ["Ba", "clan_name", ["PPL_HALPULAAR"], ["Bâ", "Bah"]],
      ["Sow", "clan_name", ["PPL_HALPULAAR"], []],
      ["Diallo", "clan_name", ["PPL_FULA"], ["Jallo"]],
      ["Sy", "clan_name", ["PPL_HALPULAAR"], ["Si"]],
      ["Cissé", "clan_name", ["PPL_SONINKE"], ["Cisse", "Sisse"]],
    ],
  },

  GMB: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Mêmes clans que le bassin sénégambien, sous graphie anglophone : Jallow pour Diallo, " +
      "Ceesay pour Cissé, Njie pour Ndiaye. La graphie, non le nom, distingue les deux pays.",
    verificationLead:
      "Listes électorales gambiennes (IEC), Gambia Bureau of Statistics, onomastique mandingue",
    names: [
      ["Jallow", "clan_name", ["PPL_FULA"], ["Diallo"]],
      ["Ceesay", "clan_name", ["PPL_SONINKE"], ["Cissé"]],
      ["Touray", "clan_name", ["PPL_MALINKE"], ["Touré"]],
      ["Sanneh", "clan_name", ["PPL_MALINKE"], ["Sané"]],
      ["Jammeh", "clan_name", ["PPL_JOLA"], ["Jammé"]],
      ["Bojang", "clan_name", ["PPL_MALINKE"], []],
      ["Njie", "clan_name", ["PPL_WOLOF"], ["Ndiaye"]],
      ["Sonko", "clan_name", ["PPL_JOLA"], []],
      ["Darboe", "clan_name", ["PPL_MALINKE"], ["Dabo"]],
      ["Camara", "clan_name", ["PPL_MALINKE"], ["Kamara"]],
      ["Manneh", "clan_name", ["PPL_MALINKE"], ["Mané"]],
      ["Bah", "clan_name", ["PPL_FULA"], ["Ba"]],
    ],
  },

  MLI: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Le jamu mandingue est le cas de référence du corpus : nom de clan patrilinéaire, " +
      "adossé au sanankuya (parenté à plaisanterie) qui lie des patronymes deux à deux.",
    verificationLead:
      "RAVEC (registre biométrique malien), INSTAT, travaux d'onomastique mandingue",
    names: [
      ["Traoré", "clan_name", ["PPL_BAMBARA"], ["Traore", "Tarawele"]],
      ["Keïta", "clan_name", ["PPL_MALINKE"], ["Keita"]],
      ["Coulibaly", "clan_name", ["PPL_BAMBARA"], ["Kulibali"]],
      ["Diarra", "clan_name", ["PPL_BAMBARA"], ["Jara"]],
      ["Konaté", "clan_name", ["PPL_MALINKE"], ["Konate"]],
      ["Sissoko", "clan_name", ["PPL_SONINKE"], ["Cissoko"]],
      ["Doumbia", "clan_name", ["PPL_BAMBARA"], []],
      ["Sidibé", "clan_name", ["PPL_FULA"], ["Sidibe"]],
      ["Cissé", "clan_name", ["PPL_SONINKE"], ["Cisse"]],
      ["Touré", "clan_name", ["PPL_SONINKE"], ["Toure"]],
      ["Maïga", "clan_name", ["PPL_SONGHAI"], ["Maiga"]],
      ["Diakité", "clan_name", ["PPL_FULA"], ["Diakite"]],
      ["Dembélé", "clan_name", ["PPL_BAMBARA"], ["Dembele"]],
      ["Sangaré", "clan_name", ["PPL_FULA"], ["Sangare"]],
      ["Camara", "clan_name", ["PPL_MALINKE"], ["Kamara"]],
      ["Fofana", "clan_name", ["PPL_SONINKE"], []],
      ["Kanté", "clan_name", ["PPL_MALINKE"], ["Kante"]],
      ["Sanogo", "clan_name", ["PPL_SENUFO"], []],
      ["Bagayoko", "clan_name", ["PPL_BAMBARA"], []],
      ["Guindo", "clan_name", ["PPL_DOGON"], []],
    ],
  },

  BFA: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Les noms mossi (Ouédraogo, Compaoré, Kaboré) sont des noms de lignage rattachés à la " +
      "geste de Naaba Wedraogo, non des jamu mandingues ; la parenté à plaisanterie y opère aussi.",
    verificationLead:
      "Listes électorales CENI, INSD, onomastique mooré et dioula",
    names: [
      ["Ouédraogo", "clan_name", ["PPL_MOSSI"], ["Ouedraogo", "Wedraogo"]],
      ["Sawadogo", "clan_name", ["PPL_MOSSI"], []],
      ["Compaoré", "clan_name", ["PPL_MOSSI"], ["Compaore"]],
      ["Kaboré", "clan_name", ["PPL_MOSSI"], ["Kabore"]],
      ["Zongo", "clan_name", ["PPL_MOSSI"], []],
      ["Nikiéma", "clan_name", ["PPL_MOSSI"], ["Nikiema"]],
      ["Traoré", "clan_name", ["PPL_DIOULA"], ["Traore"]],
      ["Ouattara", "clan_name", ["PPL_DIOULA"], ["Watara"]],
      ["Sanou", "clan_name", [], []],
      ["Bationo", "clan_name", ["PPL_MOSSI"], []],
      ["Sankara", "clan_name", [], []],
      ["Ilboudo", "clan_name", ["PPL_MOSSI"], []],
      ["Congo", "clan_name", ["PPL_MOSSI"], ["Kongo"]],
      ["Nacoulma", "clan_name", ["PPL_MOSSI"], []],
      ["Tapsoba", "clan_name", ["PPL_MOSSI"], []],
      ["Yaméogo", "clan_name", ["PPL_MOSSI"], ["Yameogo"]],
      ["Sorgho", "clan_name", ["PPL_MOSSI"], []],
      ["Ouoba", "clan_name", ["PPL_GOURMANTCHE"], []],
      ["Barry", "clan_name", ["PPL_FULA"], []],
      ["Coulibaly", "clan_name", ["PPL_DIOULA"], []],
    ],
  },

  NER: {
    dominantNameSystem: "non_hereditary_patronymic",
    onomasticNote:
      "Chez les Hausa et les Zarma-Songhay, le second nom est massivement le prénom du père " +
      "et change à chaque génération ; les noms hérités (Maïga, Kountché) restent minoritaires. " +
      "La chaîne touarègue explicite la filiation par la particule Ag (« fils de ») là où le " +
      "haoussa et le zarma se contentent de juxtaposer : Rhissa est ici classé en patronyme non " +
      "héréditaire au titre de l'élément de chaîne, non de la particule.",
    verificationLead:
      "Fichier électoral CENI Niger, INS Niger, travaux d'anthroponymie haoussa et zarma",
    names: [
      ["Maïga", "clan_name", ["PPL_SONGHAI"], ["Maiga"]],
      ["Amadou", "non_hereditary_patronymic", ["PPL_HAUSA"], ["Amadu"]],
      ["Moussa", "non_hereditary_patronymic", ["PPL_ZARMA"], ["Musa"]],
      ["Boubacar", "non_hereditary_patronymic", ["PPL_HAUSA"], ["Aboubacar"]],
      ["Garba", "non_hereditary_patronymic", ["PPL_HAUSA"], []],
      ["Issaka", "non_hereditary_patronymic", ["PPL_ZARMA"], ["Issaca"]],
      ["Oumarou", "non_hereditary_patronymic", ["PPL_HAUSA"], ["Umaru"]],
      ["Seyni", "non_hereditary_patronymic", ["PPL_ZARMA"], []],
      ["Idrissa", "non_hereditary_patronymic", ["PPL_ZARMA"], ["Idrissou"]],
      ["Souley", "non_hereditary_patronymic", ["PPL_ZARMA"], ["Soulé"]],
      ["Hamidou", "non_hereditary_patronymic", ["PPL_FULA"], []],
      ["Abdoulaye", "non_hereditary_patronymic", ["PPL_HAUSA"], ["Abdulai"]],
      ["Kountché", "clan_name", ["PPL_ZARMA"], ["Kounche"]],
      ["Diori", "clan_name", ["PPL_ZARMA"], []],
      ["Mahamadou", "non_hereditary_patronymic", ["PPL_HAUSA"], ["Mahamane"]],
      ["Issoufou", "non_hereditary_patronymic", ["PPL_HAUSA"], ["Yssoufou"]],
      ["Yacouba", "non_hereditary_patronymic", ["PPL_ZARMA"], ["Yakouba"]],
      ["Salifou", "non_hereditary_patronymic", ["PPL_ZARMA"], ["Salif"]],
      ["Ousmane", "non_hereditary_patronymic", ["PPL_FULA"], ["Usman"]],
      ["Rhissa", "non_hereditary_patronymic", ["PPL_TUAREG"], []],
    ],
  },

  GIN: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Trois traditions se superposent : jamu mandingue (Keïta, Kourouma), clans peuls du " +
      "Fouta-Djalon (Diallo, Barry, Bah, Sow) et noms soussou du littoral (Soumah, Bangoura).",
    verificationLead:
      "Fichier électoral CENI Guinée, INS Guinée, onomastique du Fouta-Djalon",
    names: [
      ["Diallo", "clan_name", ["PPL_FULA"], ["Jallo"]],
      ["Barry", "clan_name", ["PPL_FULA"], ["Bari"]],
      ["Bah", "clan_name", ["PPL_FULA"], ["Ba"]],
      ["Sow", "clan_name", ["PPL_FULA"], []],
      ["Camara", "clan_name", ["PPL_MALINKE"], ["Kamara"]],
      ["Condé", "clan_name", ["PPL_MALINKE"], ["Conde"]],
      ["Touré", "clan_name", ["PPL_MALINKE"], ["Toure"]],
      ["Sylla", "clan_name", ["PPL_MALINKE"], ["Silla"]],
      ["Keïta", "clan_name", ["PPL_MALINKE"], ["Keita"]],
      ["Soumah", "clan_name", ["PPL_SOUSSOU"], ["Souma"]],
      ["Bangoura", "clan_name", ["PPL_SOUSSOU"], []],
      ["Kourouma", "clan_name", ["PPL_MALINKE"], []],
    ],
  },

  GNB: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Deux couches : patronymes ouest-africains sous graphie portugaise (Camará, Baldé, Djaló) " +
      "et noms lusophones hérités de la colonisation (Vieira, Gomes, Pereira) portés sans ascendance européenne.",
    verificationLead:
      "Recenseamento Geral (INE Guiné-Bissau), listes électorales CNE, onomastique balante et manjaque",
    names: [
      ["Camará", "clan_name", ["PPL_MALINKE"], ["Camara"]],
      ["Baldé", "clan_name", ["PPL_FULA"], ["Balde"]],
      ["Djaló", "clan_name", ["PPL_FULA"], ["Diallo", "Jalo"]],
      ["Embaló", "clan_name", ["PPL_FULA"], ["Embalo"]],
      ["Sanhá", "clan_name", [], ["Sanha"]],
      ["Injai", "clan_name", ["PPL_BALANTA"], []],
      ["Có", "clan_name", ["PPL_PAPEL"], ["Co"]],
      ["Seidi", "clan_name", [], []],
      ["Nhassé", "clan_name", ["PPL_BALANTA"], ["Nhasse"]],
      ["Vieira", "clan_name", [], []],
      ["Gomes", "clan_name", [], []],
      ["Pereira", "clan_name", [], []],
    ],
  },

  CIV: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Les noms akan les plus fréquents (Kouassi, Yao, Kouamé, Konan) sont des noms de jour " +
      "(kradin) devenus héréditaires : ni jamu clanique ni patronyme non héréditaire au sens strict. " +
      "La classification retenue ici est provisoire et doit être tranchée à la revue.",
    verificationLead:
      "Liste électorale CEI, RGPH INS Côte d'Ivoire, travaux sur les noms de jour akan",
    names: [
      ["Kouassi", "non_hereditary_patronymic", ["PPL_BAOULE"], ["Kwasi"]],
      ["Koné", "clan_name", ["PPL_DIOULA"], ["Kone"]],
      ["Traoré", "clan_name", ["PPL_DIOULA"], ["Traore"]],
      ["Yao", "non_hereditary_patronymic", ["PPL_BAOULE"], ["Yaw"]],
      [
        "Kouamé",
        "non_hereditary_patronymic",
        ["PPL_BAOULE"],
        ["Kouame", "Kwame"],
      ],
      ["Konan", "non_hereditary_patronymic", ["PPL_BAOULE"], []],
      ["Bamba", "clan_name", ["PPL_DIOULA"], []],
      ["Ouattara", "clan_name", ["PPL_DIOULA"], ["Watara"]],
      ["Coulibaly", "clan_name", ["PPL_DIOULA"], []],
      ["Diomandé", "clan_name", ["PPL_DAN"], ["Diomande"]],
      ["N'Guessan", "non_hereditary_patronymic", ["PPL_BAOULE"], ["Nguessan"]],
      ["Doumbia", "clan_name", ["PPL_DIOULA"], []],
      ["Kouadio", "non_hereditary_patronymic", ["PPL_BAOULE"], []],
      ["Kouakou", "non_hereditary_patronymic", ["PPL_BAOULE"], []],
      ["Bédié", "clan_name", ["PPL_BAOULE"], ["Bedie"]],
      ["Gbagbo", "clan_name", ["PPL_BETE"], []],
      ["Zadi", "clan_name", ["PPL_BETE"], []],
      ["Silué", "clan_name", ["PPL_SENUFO"], ["Silue"]],
      ["Soro", "clan_name", ["PPL_SENUFO"], []],
      ["Fofana", "clan_name", ["PPL_DIOULA"], []],
    ],
  },

  GHA: {
    dominantNameSystem: "non_hereditary_patronymic",
    onomasticNote:
      "Les noms de jour akan (Mensah, Kwame, Yaw, Kofi) coexistent avec des noms de famille " +
      "hérités (Boateng, Owusu, Asante) et, au nord, des patronymes musulmans dagomba.",
    verificationLead:
      "Ghana Statistical Service (PHC), Electoral Commission roll, littérature sur l'onomastique akan",
    names: [
      ["Mensah", "non_hereditary_patronymic", ["PPL_AKAN"], []],
      ["Owusu", "clan_name", ["PPL_ASANTE"], []],
      ["Boateng", "clan_name", ["PPL_ASANTE"], []],
      ["Osei", "clan_name", ["PPL_ASANTE"], []],
      ["Asante", "clan_name", ["PPL_ASANTE"], ["Ashanti"]],
      ["Agyemang", "clan_name", ["PPL_ASANTE"], []],
      ["Appiah", "clan_name", ["PPL_AKAN"], []],
      ["Amoah", "clan_name", ["PPL_FANTE"], []],
      ["Addo", "clan_name", ["PPL_AKAN"], []],
      ["Tetteh", "non_hereditary_patronymic", ["PPL_GA"], ["Teteh"]],
      ["Quartey", "clan_name", ["PPL_GA"], []],
      ["Adjei", "clan_name", ["PPL_AKAN"], []],
      ["Kwame", "non_hereditary_patronymic", ["PPL_AKAN"], ["Kwamé"]],
      ["Kofi", "non_hereditary_patronymic", ["PPL_AKAN"], []],
      ["Yeboah", "clan_name", ["PPL_ASANTE"], []],
      ["Ansah", "clan_name", ["PPL_FANTE"], []],
      ["Nkrumah", "clan_name", ["PPL_NZEMA"], []],
      ["Nortey", "clan_name", ["PPL_GA"], []],
      ["Gbedemah", "clan_name", ["PPL_EWE"], []],
      ["Abdulai", "non_hereditary_patronymic", ["PPL_DAGOMBA"], ["Abdulaï"]],
    ],
  },

  TGO: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Le sud éwé et le nord kabyè n'ont pas la même logique : au sud les noms renvoient au jour " +
      "ou aux circonstances de naissance, au nord ils marquent le lignage.",
    verificationLead:
      "Listes électorales CENI Togo, INSEED, travaux d'onomastique éwé et kabyè",
    names: [
      ["Agbo", "clan_name", ["PPL_EWE"], []],
      ["Adjei", "clan_name", ["PPL_EWE"], []],
      ["Amegan", "clan_name", ["PPL_EWE"], []],
      ["Gnassingbé", "clan_name", [], ["Gnassingbe"]],
      ["Kossi", "non_hereditary_patronymic", ["PPL_EWE"], []],
      ["Komlan", "non_hereditary_patronymic", ["PPL_EWE"], []],
      ["Ayité", "clan_name", ["PPL_EWE"], ["Ayite"]],
      ["Amoussou", "clan_name", ["PPL_EWE"], []],
      ["Lawson", "clan_name", [], []],
      ["Johnson", "clan_name", [], []],
      ["Tchalla", "clan_name", [], []],
      ["Bodjona", "clan_name", [], []],
    ],
  },

  BEN: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Les noms fon et goun sont souvent des énoncés (Houngbédji, Adjovi) plutôt que des noms de " +
      "clan ; le nord bariba et dendi relève d'une onomastique musulmane distincte.",
    verificationLead:
      "Listes électorales CENA Bénin, INSAE, travaux sur l'anthroponymie fon et yoruba",
    names: [
      ["Houngbédji", "clan_name", ["PPL_FON"], ["Houngbedji"]],
      ["Adjovi", "clan_name", ["PPL_FON"], []],
      ["Agbodjan", "clan_name", ["PPL_FON"], []],
      ["Dossou", "clan_name", ["PPL_FON"], []],
      ["Ahouansou", "clan_name", ["PPL_FON"], []],
      ["Zinsou", "clan_name", ["PPL_FON"], []],
      ["Gbaguidi", "clan_name", ["PPL_FON"], []],
      ["Alao", "praise_name", ["PPL_YORUBA"], []],
      ["Ogunbiyi", "praise_name", ["PPL_YORUBA"], []],
      ["Bio", "clan_name", ["PPL_BARIBA"], []],
      ["Soumanou", "non_hereditary_patronymic", ["PPL_DENDI"], []],
      ["Kpodo", "clan_name", ["PPL_ADJA"], []],
    ],
  },

  NGA: {
    dominantNameSystem: "praise_name",
    onomasticNote:
      "Trois systèmes distincts : oríkì yoruba (le nom est un énoncé sur l'òrìṣà ou le lignage), " +
      "noms igbo théophores (Chukwu-, Nna-), et chaîne patronymique haoussa-peule au nord. " +
      "Les oruko amutorunwa — noms « apportés du ciel », attribués par la circonstance de la " +
      "naissance (Taiwo et Kehinde pour les jumeaux, Ojo pour l'enfant né le cordon au cou) — " +
      "ne sont ni des oríkì ni des noms de lignage : ils sont classés ici en praise_name faute " +
      "de valeur plus proche, et la classification reste à trancher à la revue.",
    verificationLead:
      "INEC voter register, NPC census, littérature sur l'oríkì yoruba et l'anthroponymie igbo",
    names: [
      ["Adebayo", "praise_name", ["PPL_YORUBA"], ["Adébayo"]],
      ["Okafor", "clan_name", ["PPL_IGBO"], []],
      ["Ogunleye", "praise_name", ["PPL_YORUBA"], []],
      ["Chukwu", "clan_name", ["PPL_IGBO"], ["Chukwuma"]],
      ["Adeyemi", "praise_name", ["PPL_YORUBA"], []],
      ["Nwachukwu", "clan_name", ["PPL_IGBO"], []],
      ["Okonkwo", "clan_name", ["PPL_IGBO"], []],
      ["Bello", "non_hereditary_patronymic", ["PPL_HAUSA"], []],
      ["Musa", "non_hereditary_patronymic", ["PPL_HAUSA"], ["Moussa"]],
      ["Abubakar", "non_hereditary_patronymic", ["PPL_HAUSA"], ["Abubakre"]],
      ["Eze", "clan_name", ["PPL_IGBO"], []],
      ["Balogun", "praise_name", ["PPL_YORUBA"], []],
      ["Adekunle", "praise_name", ["PPL_YORUBA"], []],
      ["Olawale", "praise_name", ["PPL_YORUBA"], ["Olawalé"]],
      ["Babatunde", "praise_name", ["PPL_YORUBA"], ["Babatundé"]],
      ["Taiwo", "praise_name", ["PPL_YORUBA"], ["Taiye"]],
      ["Kehinde", "praise_name", ["PPL_YORUBA"], ["Kehindé"]],
      ["Ojo", "praise_name", ["PPL_YORUBA"], []],
      ["Okoro", "clan_name", ["PPL_IGBO"], []],
      ["Nwosu", "clan_name", ["PPL_IGBO"], []],
      ["Obi", "clan_name", ["PPL_IGBO"], []],
      ["Chinedu", "clan_name", ["PPL_IGBO"], []],
      ["Yusuf", "non_hereditary_patronymic", ["PPL_HAUSA"], ["Yusufu"]],
      ["Aliyu", "non_hereditary_patronymic", ["PPL_HAUSA"], []],
      ["Sani", "non_hereditary_patronymic", ["PPL_HAUSA"], []],
      ["Danjuma", "non_hereditary_patronymic", ["PPL_HAUSA"], []],
      ["Ekpo", "clan_name", ["PPL_IBIBIO"], []],
      ["Gyang", "clan_name", ["PPL_BEROM"], []],
      ["Aondoakaa", "clan_name", ["PPL_TIV"], []],
      ["Amachree", "clan_name", ["PPL_KALAIBARI"], []],
    ],
  },

  LBR: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Deux couches irréconciliées : patronymes américano-libériens hérités des colons affranchis " +
      "(Johnson, Tubman, Doe) et noms de lignage kpelle, bassa et mandé de l'intérieur.",
    verificationLead:
      "NEC voter roll, LISGIS census, travaux sur l'onomastique américano-libérienne",
    names: [
      ["Johnson", "clan_name", ["PPL_AMERICANO_LIBERIENS"], []],
      ["Doe", "clan_name", ["PPL_KRU"], []],
      ["Kollie", "clan_name", ["PPL_KPELLE"], ["Kolli"]],
      ["Weah", "clan_name", ["PPL_KRU"], []],
      ["Kamara", "clan_name", [], ["Camara"]],
      ["Gbedee", "clan_name", ["PPL_BASSA"], []],
      ["Cooper", "clan_name", ["PPL_AMERICANO_LIBERIENS"], []],
      ["Tubman", "clan_name", ["PPL_AMERICANO_LIBERIENS"], []],
      ["Sirleaf", "clan_name", [], []],
      ["Freeman", "clan_name", ["PPL_AMERICANO_LIBERIENS"], []],
      ["Toe", "clan_name", ["PPL_KRU"], []],
      ["Nyenkan", "clan_name", ["PPL_KPELLE"], []],
    ],
  },

  SLE: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Les patronymes krio (Cole, Coker, Wright) sont ceux de recaptifs libérés à Freetown ; " +
      "l'intérieur mende et temné porte des noms de lignage sans rapport avec cette couche.",
    verificationLead:
      "NEC Sierra Leone voter register, Statistics Sierra Leone, travaux sur l'onomastique krio",
    names: [
      ["Kamara", "clan_name", [], ["Camara"]],
      ["Sesay", "clan_name", [], ["Cissé"]],
      ["Conteh", "clan_name", [], ["Condé"]],
      ["Bangura", "clan_name", [], ["Bangoura"]],
      ["Koroma", "clan_name", [], ["Kourouma"]],
      ["Turay", "clan_name", [], ["Touré"]],
      ["Mansaray", "clan_name", [], []],
      ["Jalloh", "clan_name", ["PPL_FULA"], ["Diallo"]],
      ["Cole", "clan_name", ["PPL_KRIO"], []],
      ["Coker", "clan_name", ["PPL_KRIO"], []],
      ["Fofanah", "clan_name", [], ["Fofana"]],
      ["Kargbo", "clan_name", [], []],
    ],
  },

  MRT: {
    dominantNameSystem: "nisba",
    onomasticNote:
      "Les Bidhan portent des nisba tribales (Ould X, Ahl X) ; les Haalpulaar, Soninké et Wolof " +
      "du fleuve portent des noms de clan ouest-africains. Les deux systèmes coexistent sans se mélanger.",
    verificationLead:
      "ANRPTS (registre national), ONS Mauritanie, travaux sur les nisba hassaniyya",
    names: [
      ["Ould Ahmed", "nisba", [], ["Weld Ahmed"]],
      ["Ould Mohamed", "nisba", [], []],
      ["Ould Abdallahi", "nisba", [], []],
      ["Ould Cheikh", "nisba", [], []],
      ["Ahl Sidi", "nisba", [], []],
      ["Ba", "clan_name", ["PPL_HALPULAAR"], ["Bâ"]],
      ["Sow", "clan_name", ["PPL_HALPULAAR"], []],
      ["Diallo", "clan_name", ["PPL_FULA"], []],
      ["Kane", "clan_name", ["PPL_HALPULAAR"], []],
      ["Sy", "clan_name", ["PPL_HALPULAAR"], []],
      ["Soumaré", "clan_name", ["PPL_SONINKE"], ["Soumare"]],
      ["Tandia", "clan_name", ["PPL_SONINKE"], []],
    ],
  },

  CPV: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "L'anthroponymie est entièrement lusophone : les patronymes portugais ont été imposés à " +
      "l'affranchissement et ne renvoient à aucune ascendance européenne. Aucun nom de clan africain n'y a survécu.",
    verificationLead:
      "INE Cabo Verde (recenseamento), Conservatória dos Registos, travaux sur la créolisation onomastique",
    names: [
      ["Silva", "clan_name", ["PPL_CREOLE_CABOVERDIEN"], ["da Silva"]],
      ["Fernandes", "clan_name", ["PPL_CREOLE_CABOVERDIEN"], []],
      ["Gomes", "clan_name", ["PPL_CREOLE_CABOVERDIEN"], []],
      ["Monteiro", "clan_name", ["PPL_CREOLE_CABOVERDIEN"], []],
      ["Lopes", "clan_name", ["PPL_CREOLE_CABOVERDIEN"], []],
      ["Pereira", "clan_name", ["PPL_CREOLE_CABOVERDIEN"], []],
      ["Rodrigues", "clan_name", ["PPL_CREOLE_CABOVERDIEN"], []],
      ["Semedo", "clan_name", ["PPL_CREOLE_CABOVERDIEN"], []],
      ["Tavares", "clan_name", ["PPL_CREOLE_CABOVERDIEN"], []],
      ["Évora", "clan_name", ["PPL_CREOLE_CABOVERDIEN"], ["Evora"]],
      ["Barros", "clan_name", ["PPL_CREOLE_CABOVERDIEN"], []],
      ["Duarte", "clan_name", ["PPL_CREOLE_CABOVERDIEN"], []],
    ],
  },

  // ===========================================================================
  // Afrique centrale
  // ===========================================================================
  CMR: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Le pays cumule quatre onomastiques : noms de lignage beti-fang (Mba, Ndongo), noms bamiléké " +
      "rattachés à une chefferie, patronymes peuls et kanuri au nord, patronymes anglophones à l'ouest.",
    verificationLead:
      "ELECAM voter register, BUCREP (recensement), travaux sur l'anthroponymie beti et bamiléké",
    names: [
      ["Mba", "clan_name", ["PPL_BETI"], []],
      ["Ndongo", "clan_name", ["PPL_BETI"], []],
      ["Ateba", "clan_name", ["PPL_EWONDO"], []],
      ["Essomba", "clan_name", ["PPL_EWONDO"], []],
      ["Nkoulou", "clan_name", ["PPL_BETI"], []],
      ["Fotso", "clan_name", ["PPL_BAMILEKE"], []],
      ["Kamdem", "clan_name", ["PPL_BAMILEKE"], []],
      ["Tchoumba", "clan_name", ["PPL_BAMILEKE"], []],
      ["Nguema", "clan_name", ["PPL_FANG"], []],
      ["Bello", "non_hereditary_patronymic", ["PPL_FULA"], []],
      ["Njoya", "clan_name", [], []],
      ["Eyoum", "clan_name", ["PPL_SAWA"], []],
      ["Biya", "clan_name", ["PPL_BULU"], []],
      ["Onana", "clan_name", ["PPL_EWONDO"], []],
      ["Mvondo", "clan_name", ["PPL_EWONDO"], []],
      ["Kameni", "clan_name", ["PPL_BAMILEKE"], []],
      ["Djoumessi", "clan_name", ["PPL_BAMILEKE"], []],
      ["Bell", "clan_name", ["PPL_DUALA"], ["Manga Bell"]],
      ["Nyobè", "clan_name", ["PPL_BASSA_CAM"], ["Nyobe"]],
      ["Aboubakar", "non_hereditary_patronymic", ["PPL_FULA"], ["Abubakar"]],
    ],
  },

  TCD: {
    dominantNameSystem: "non_hereditary_patronymic",
    onomasticNote:
      "Le nord arabophone et toubou suit la chaîne de prénoms ; le sud sara porte des noms de " +
      "clan patrilinéaires. Déby Itno fait exception : c'est un nom de lignage zaghawa.",
    verificationLead:
      "CENI Tchad, INSEED, travaux sur l'anthroponymie sara et les nisba tchadiennes",
    names: [
      ["Déby", "clan_name", ["PPL_ZAGHAWA"], ["Deby"]],
      ["Mahamat", "non_hereditary_patronymic", [], ["Mahamad"]],
      ["Abdelkerim", "non_hereditary_patronymic", [], []],
      ["Hassan", "non_hereditary_patronymic", [], []],
      ["Youssouf", "non_hereditary_patronymic", [], ["Yousouf"]],
      ["Adoum", "non_hereditary_patronymic", [], []],
      ["Saleh", "non_hereditary_patronymic", [], []],
      ["Ngarlejy", "clan_name", ["PPL_SARA"], []],
      ["Nadjita", "clan_name", ["PPL_SARA"], []],
      ["Doumgor", "clan_name", ["PPL_SARA"], []],
      ["Ngarta", "clan_name", ["PPL_SARA"], []],
      ["Djimet", "clan_name", [], []],
    ],
  },

  CAF: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Noms de lignage gbaya, banda et sara au centre et à l'ouest ; onomastique musulmane " +
      "au nord-est, sur la frange soudanaise.",
    verificationLead:
      "ANE Centrafrique, ICASEES, travaux sur l'anthroponymie gbaya et banda",
    names: [
      ["Bozizé", "clan_name", ["PPL_GBAYA"], ["Bozize"]],
      ["Touadéra", "clan_name", [], ["Touadera"]],
      ["Kolingba", "clan_name", ["PPL_BANDA"], []],
      ["Ngaïssona", "clan_name", [], ["Ngaissona"]],
      ["Yakité", "clan_name", [], ["Yakite"]],
      ["Sarandji", "clan_name", ["PPL_SARA"], []],
      ["Namsio", "clan_name", ["PPL_SARA"], []],
      ["Yalinga", "clan_name", ["PPL_BANDA"], []],
      ["Mokom", "clan_name", [], []],
      ["Gaombalet", "clan_name", [], []],
      ["Bangayassi", "clan_name", ["PPL_GBAYA"], []],
      ["Doubane", "clan_name", [], []],
    ],
  },

  GAB: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Les noms fang (Nguema, Obame, Ondo) marquent le clan (ayong) et se retrouvent à l'identique " +
      "en Guinée équatoriale et au sud-Cameroun : la frontière coloniale a coupé un même espace onomastique.",
    verificationLead:
      "CGE Gabon, RGPL (recensement), travaux sur les clans fang (ayong)",
    names: [
      ["Nguema", "clan_name", ["PPL_FANG"], ["Nguéma"]],
      ["Obame", "clan_name", ["PPL_FANG"], []],
      ["Ondo", "clan_name", ["PPL_FANG"], []],
      ["Bongo", "clan_name", ["PPL_TEKE"], []],
      ["Ndong", "clan_name", ["PPL_FANG"], []],
      ["Mba", "clan_name", ["PPL_FANG"], []],
      ["Moussavou", "clan_name", ["PPL_PUNU"], []],
      ["Boussougou", "clan_name", ["PPL_PUNU"], []],
      ["Mengue", "clan_name", ["PPL_FANG"], []],
      ["Ovono", "clan_name", ["PPL_FANG"], []],
      ["Nzue", "clan_name", ["PPL_FANG"], ["Nzué"]],
      ["Mintsa", "clan_name", ["PPL_FANG"], []],
    ],
  },

  GNQ: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Nom de clan fang suivi d'un patronyme espagnol imposé à l'état civil colonial : " +
      "Obiang Nguema Mbasogo enchaîne trois éléments dont deux sont des ayong distincts.",
    verificationLead:
      "INEGE (censo), registro civil, travaux comparés sur les ayong fang du Gabon et du Cameroun",
    names: [
      ["Obiang", "clan_name", ["PPL_FANG"], []],
      ["Nguema", "clan_name", ["PPL_FANG"], []],
      ["Mbasogo", "clan_name", ["PPL_FANG"], []],
      ["Ondo", "clan_name", ["PPL_FANG"], []],
      ["Nsue", "clan_name", ["PPL_FANG"], ["Nsué"]],
      ["Mba", "clan_name", ["PPL_FANG"], []],
      ["Esono", "clan_name", ["PPL_FANG"], []],
      ["Nchama", "clan_name", ["PPL_FANG"], []],
      ["Ela", "clan_name", ["PPL_FANG"], []],
      ["Bindang", "clan_name", ["PPL_FANG"], []],
      ["Sipoto", "clan_name", ["PPL_BUBI"], []],
      ["Boricó", "clan_name", ["PPL_BUBI"], ["Borico"]],
    ],
  },

  COG: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Noms kongo (Nkounkou, Mabiala), téké et mbochi, doublés de prénoms français hérités de " +
      "l'état civil colonial. Le clan kongo (kanda) est matrilinéaire, contrairement au jamu mandingue.",
    verificationLead: "CNEI Congo, INS Congo, travaux sur le kanda kongo",
    names: [
      ["Nkounkou", "clan_name", ["PPL_KONGO"], []],
      ["Mabiala", "clan_name", ["PPL_KONGO"], []],
      ["Makosso", "clan_name", ["PPL_KONGO"], []],
      ["Ngoma", "clan_name", ["PPL_KONGO"], []],
      ["Sassou", "clan_name", ["PPL_MBOCHI"], []],
      ["Nguesso", "clan_name", ["PPL_MBOCHI"], []],
      ["Loubaki", "clan_name", ["PPL_KONGO"], []],
      ["Okemba", "clan_name", ["PPL_MBOCHI"], []],
      ["Mouanda", "clan_name", ["PPL_KONGO"], []],
      ["Tchicaya", "clan_name", ["PPL_YOMBE"], []],
      ["Bakala", "clan_name", ["PPL_KONGO"], []],
      ["Mavoungou", "clan_name", ["PPL_YOMBE"], []],
    ],
  },

  COD: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "L'authenticité mobutiste (1972) a proscrit les prénoms chrétiens et imposé le postnom " +
      "africain : une rupture d'état civil qui rend la série des patronymes congolais datable. " +
      "Deux séries échappent au nom de clan et sont classées en patronyme non héréditaire faute " +
      "de valeur plus proche : les noms nande de rang de naissance (Kambale, Muhindo, Kasereka) " +
      "désignent la place dans la fratrie et non une filiation, et le postnom swahiliphone de " +
      "l'Est (Bahati) est un prénom repris en position de nom. Nsimba et Nzuzi forment de leur " +
      "côté une paire kongo de jumeaux, aîné puis cadet.",
    verificationLead:
      "CENI RDC (fichier électoral), INS RDC, travaux sur la zaïrianisation des noms (1972)",
    names: [
      ["Kabila", "clan_name", [], []],
      ["Mukendi", "clan_name", ["PPL_LUBA"], []],
      ["Tshisekedi", "clan_name", ["PPL_LUBA"], []],
      ["Ilunga", "clan_name", ["PPL_LUBA"], []],
      ["Kalonji", "clan_name", ["PPL_LUBA"], []],
      ["Mbuyi", "clan_name", ["PPL_LUBA"], []],
      ["Mwamba", "clan_name", ["PPL_LUBA"], []],
      ["Ngoy", "clan_name", ["PPL_LUBA"], []],
      ["Kasongo", "clan_name", [], []],
      ["Lumumba", "clan_name", [], []],
      ["Bemba", "clan_name", [], []],
      ["Mputu", "clan_name", ["PPL_KONGO"], []],
      ["Mutombo", "clan_name", ["PPL_LUBA"], []],
      ["Kanyinda", "clan_name", ["PPL_LUBA"], []],
      ["Kabongo", "clan_name", ["PPL_LUBA"], []],
      ["Tshibangu", "clan_name", ["PPL_LUBA_KASAI"], []],
      ["Nkongolo", "clan_name", ["PPL_LUBA"], []],
      ["Kalala", "clan_name", ["PPL_LUBA"], []],
      ["Mulumba", "clan_name", ["PPL_LUBA"], []],
      ["Kazadi", "clan_name", ["PPL_LUBA"], []],
      ["Kayembe", "clan_name", ["PPL_LUBA"], []],
      ["Mobutu", "clan_name", ["PPL_NGBANDE"], []],
      ["Kimbangu", "clan_name", ["PPL_KONGO"], []],
      ["Nsimba", "clan_name", ["PPL_KONGO"], []],
      ["Nzuzi", "clan_name", ["PPL_KONGO"], []],
      ["Ngoma", "clan_name", ["PPL_KONGO"], []],
      ["Kambale", "non_hereditary_patronymic", ["PPL_NANDE"], []],
      ["Muhindo", "non_hereditary_patronymic", ["PPL_NANDE"], []],
      ["Kasereka", "non_hereditary_patronymic", ["PPL_NANDE"], []],
      ["Bahati", "non_hereditary_patronymic", ["PPL_SWAHILI"], []],
    ],
  },

  AGO: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Patronymes portugais massivement imposés (dos Santos, Neto), sous lesquels subsistent " +
      "des noms ovimbundu et kimbundu (Savimbi, Nzinga) que l'état civil colonial n'a pas effacés.",
    verificationLead:
      "INE Angola (recenseamento), Conservatória, travaux sur l'assimilação et les noms ovimbundu",
    names: [
      ["dos Santos", "clan_name", [], ["Santos"]],
      ["Neto", "clan_name", [], []],
      ["da Silva", "clan_name", [], ["Silva"]],
      ["Ferreira", "clan_name", [], []],
      ["Domingos", "clan_name", [], []],
      ["Lourenço", "clan_name", [], ["Lourenco"]],
      ["Sebastião", "clan_name", [], ["Sebastiao"]],
      ["Savimbi", "clan_name", ["PPL_OVIMBUNDU"], []],
      ["Chivukuvuku", "clan_name", ["PPL_OVIMBUNDU"], []],
      ["Nzinga", "clan_name", ["PPL_AMBUNDU"], []],
      ["Kiala", "clan_name", ["PPL_KONGO"], []],
      ["Kalandula", "clan_name", ["PPL_AMBUNDU"], []],
      ["Gonçalves", "clan_name", [], ["Goncalves"]],
      ["Nascimento", "clan_name", [], []],
      ["Baptista", "clan_name", [], ["Batista"]],
      ["Ngola", "clan_name", ["PPL_AMBUNDU"], []],
      ["Ekuikui", "clan_name", ["PPL_OVIMBUNDU"], []],
      ["Chitunda", "clan_name", ["PPL_OVIMBUNDU"], []],
      ["Samakuva", "clan_name", ["PPL_OVIMBUNDU"], []],
      ["Lukamba", "clan_name", ["PPL_CHOKWE"], []],
    ],
  },

  STP: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Onomastique entièrement lusophone, comme au Cap-Vert, avec une strate forra distincte " +
      "de la strate angolar et des contratados venus du continent au XXe siècle.",
    verificationLead:
      "INE São Tomé (recenseamento), registo civil, travaux sur les communautés forro et angolar",
    names: [
      ["do Espírito Santo", "clan_name", ["PPL_FORROS"], ["Espirito Santo"]],
      ["Trovoada", "clan_name", ["PPL_FORROS"], []],
      ["Costa", "clan_name", [], ["da Costa"]],
      ["Neves", "clan_name", ["PPL_FORROS"], []],
      ["Carvalho", "clan_name", [], []],
      ["Pinto", "clan_name", [], []],
      ["Vaz", "clan_name", [], []],
      ["Bandeira", "clan_name", [], []],
      ["Lima", "clan_name", [], []],
      ["Rita", "clan_name", [], []],
      ["Barros", "clan_name", [], []],
      ["Menezes", "clan_name", [], []],
    ],
  },

  // ===========================================================================
  // Corne de l'Afrique et Afrique de l'Est
  // ===========================================================================
  SDN: {
    dominantNameSystem: "non_hereditary_patronymic",
    onomasticNote:
      "Chaîne de prénoms arabe (ism + nasab) doublée d'une nisba tribale (al-Jaʿali, al-Shaygiya) " +
      "qui, elle, se transmet. Le Darfour non arabophone (Four, Zaghawa) suit une logique de lignage distincte.",
    verificationLead:
      "CBS Sudan (recensement), registre d'état civil, travaux sur les nisba tribales soudanaises",
    names: [
      ["Mohamed", "non_hereditary_patronymic", [], ["Muhammad"]],
      ["Ahmed", "non_hereditary_patronymic", [], []],
      ["Hassan", "non_hereditary_patronymic", [], []],
      ["Osman", "non_hereditary_patronymic", [], ["Othman"]],
      ["Abdalla", "non_hereditary_patronymic", [], ["Abdallah"]],
      ["Bashir", "non_hereditary_patronymic", [], []],
      ["al-Jaʿali", "nisba", [], ["Jaali", "Al-Jaali"]],
      ["al-Shaygiya", "nisba", [], ["Shaigiya"]],
      ["al-Danagla", "nisba", ["PPL_NUBIENS"], ["Danagla"]],
      ["al-Rashaida", "nisba", [], ["Rashaida"]],
      ["Ibrahim", "non_hereditary_patronymic", [], []],
      ["Idris", "non_hereditary_patronymic", ["PPL_BEJA"], []],
      ["al-Mahdi", "nisba", ["PPL_ARABES_AFRIQUE"], ["Mahdi", "El Mahdi"]],
      ["al-Mirghani", "nisba", ["PPL_ARABES_AFRIQUE"], ["Mirghani"]],
      ["al-Kabbashi", "nisba", ["PPL_ARABES_AFRIQUE"], ["Kabbashi"]],
      ["al-Rizeigat", "nisba", ["PPL_BAGGAR"], ["Rizeigat", "Rizigat"]],
      ["Digna", "clan_name", ["PPL_BEJA"], []],
      ["Adam", "non_hereditary_patronymic", ["PPL_FOUR"], []],
      ["Nur", "non_hereditary_patronymic", ["PPL_FOUR"], ["Noor"]],
      ["Deng", "clan_name", ["PPL_DINKA"], []],
    ],
  },

  SSD: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Les noms dinka et nuer sont des noms personnels transmis en chaîne (Salva Kiir Mayardit) " +
      "et rattachés à une section clanique ; l'hérédité au sens de l'état civil y est récente.",
    verificationLead:
      "NBS South Sudan, registre électoral, travaux sur les sections claniques dinka et nuer",
    names: [
      ["Deng", "clan_name", ["PPL_DINKA"], []],
      ["Garang", "clan_name", ["PPL_DINKA"], []],
      ["Majok", "clan_name", ["PPL_DINKA"], []],
      ["Mayardit", "clan_name", ["PPL_DINKA"], []],
      ["Akol", "clan_name", ["PPL_DINKA"], []],
      ["Machar", "clan_name", ["PPL_NUER"], []],
      ["Gatluak", "clan_name", ["PPL_NUER"], []],
      ["Chuol", "clan_name", ["PPL_NUER"], []],
      ["Riek", "clan_name", ["PPL_NUER"], []],
      ["Nyandeng", "clan_name", ["PPL_DINKA"], []],
      ["Wani", "clan_name", [], []],
      ["Lado", "clan_name", [], []],
    ],
  },

  ETH: {
    dominantNameSystem: "non_hereditary_patronymic",
    onomasticNote:
      "Cas d'école du patronyme non héréditaire : le deuxième nom est le prénom du père et " +
      "change à chaque génération. Abiy Ahmed Ali n'a pas de nom de famille — Ahmed est son père, " +
      "Ali son grand-père. L'annuaire téléphonique d'Addis-Abeba se classe au prénom. " +
      "Le pays n'est cependant pas d'un seul système : le qabiil somali (Ogaden) et le kedo afar " +
      "(Hanfare) sont, eux, des noms de groupe transmis, et sont classés en nom de clan — la " +
      "chaîne habesha et ces deux-là ne décrivent pas la même chose. Chez les Nuer, le préfixe " +
      "Gat- (« fils de ») explicite la filiation que l'amharique laisse implicite.",
    verificationLead:
      "Ethiopian Statistics Service (recensement), registre d'état civil, travaux sur l'anthroponymie amharique et oromo",
    names: [
      ["Tesfaye", "non_hereditary_patronymic", ["PPL_AMHARA"], []],
      ["Bekele", "non_hereditary_patronymic", ["PPL_AMHARA"], []],
      ["Girma", "non_hereditary_patronymic", ["PPL_AMHARA"], []],
      ["Haile", "non_hereditary_patronymic", ["PPL_HABESHA"], ["Hailé"]],
      ["Mekonnen", "non_hereditary_patronymic", ["PPL_AMHARA"], []],
      ["Abebe", "non_hereditary_patronymic", ["PPL_AMHARA"], []],
      ["Getachew", "non_hereditary_patronymic", ["PPL_AMHARA"], []],
      ["Tadesse", "non_hereditary_patronymic", ["PPL_AMHARA"], []],
      ["Wolde", "non_hereditary_patronymic", ["PPL_HABESHA"], ["Welde"]],
      ["Kebede", "non_hereditary_patronymic", ["PPL_AMHARA"], []],
      ["Gemechu", "non_hereditary_patronymic", ["PPL_OROMO"], []],
      ["Bulcha", "non_hereditary_patronymic", ["PPL_OROMO"], []],
      ["Gebre", "non_hereditary_patronymic", ["PPL_AMHARA"], ["Gebra"]],
      ["Desta", "non_hereditary_patronymic", ["PPL_AMHARA"], []],
      ["Alemayehu", "non_hereditary_patronymic", ["PPL_AMHARA"], []],
      ["Assefa", "non_hereditary_patronymic", ["PPL_AMHARA"], ["Asefa"]],
      ["Mulugeta", "non_hereditary_patronymic", ["PPL_AMHARA"], []],
      ["Teshome", "non_hereditary_patronymic", ["PPL_AMHARA"], []],
      [
        "Gebremariam",
        "non_hereditary_patronymic",
        ["PPL_TIGRAY"],
        ["Gebre Mariam"],
      ],
      ["Berhane", "non_hereditary_patronymic", ["PPL_TIGRAY"], []],
      ["Abera", "non_hereditary_patronymic", ["PPL_OROMO"], []],
      ["Wako", "non_hereditary_patronymic", ["PPL_OROMO"], []],
      ["Jaleta", "non_hereditary_patronymic", ["PPL_OROMO"], []],
      ["Gudina", "non_hereditary_patronymic", ["PPL_OROMO"], []],
      ["Lemma", "non_hereditary_patronymic", ["PPL_OROMO"], []],
      ["Farah", "non_hereditary_patronymic", ["PPL_SOMALI"], []],
      ["Ogaden", "clan_name", ["PPL_SOMALI"], ["Ogadeen"]],
      ["Hanfare", "clan_name", ["PPL_AFAR"], []],
      ["Gatluak", "non_hereditary_patronymic", ["PPL_NUER"], []],
      ["Ojulu", "non_hereditary_patronymic", ["PPL_ANUAK"], []],
    ],
  },

  ERI: {
    dominantNameSystem: "non_hereditary_patronymic",
    onomasticNote:
      "Même système qu'en Éthiopie, avec une forte proportion de noms théophores tigrigna " +
      "(Ghebre-, Tesfa-, Weldu-) formés sur un saint ou une invocation.",
    verificationLead:
      "Registre d'état civil érythréen, travaux sur l'anthroponymie tigrigna et tigré",
    names: [
      ["Tesfay", "non_hereditary_patronymic", ["PPL_TIGRAY"], ["Tesfai"]],
      [
        "Ghebremichael",
        "non_hereditary_patronymic",
        ["PPL_TIGRAY"],
        ["Gebremichael"],
      ],
      ["Kebreab", "non_hereditary_patronymic", ["PPL_TIGRAY"], []],
      ["Haile", "non_hereditary_patronymic", ["PPL_HABESHA"], []],
      ["Berhane", "non_hereditary_patronymic", ["PPL_TIGRAY"], []],
      ["Weldu", "non_hereditary_patronymic", ["PPL_TIGRAY"], ["Woldu"]],
      ["Mehari", "non_hereditary_patronymic", ["PPL_TIGRAY"], []],
      ["Tewelde", "non_hereditary_patronymic", ["PPL_TIGRAY"], []],
      ["Habtom", "non_hereditary_patronymic", ["PPL_TIGRAY"], []],
      ["Yohannes", "non_hereditary_patronymic", ["PPL_HABESHA"], []],
      ["Idris", "non_hereditary_patronymic", ["PPL_TIGRE"], []],
      ["Okbay", "non_hereditary_patronymic", ["PPL_TIGRAY"], []],
    ],
  },

  DJI: {
    dominantNameSystem: "non_hereditary_patronymic",
    onomasticNote:
      "Chaîne patronymique somali et afar (prénom + père + grand-père), doublée d'une " +
      "appartenance claniqueenoncée séparément et non portée comme nom de famille.",
    verificationLead:
      "INSTAD Djibouti, registre d'état civil, travaux sur les qabiil somali et les clans afar",
    names: [
      ["Guelleh", "non_hereditary_patronymic", ["PPL_SOMALI"], []],
      ["Hassan", "non_hereditary_patronymic", ["PPL_SOMALI"], []],
      ["Farah", "non_hereditary_patronymic", ["PPL_SOMALI"], []],
      ["Mohamed", "non_hereditary_patronymic", ["PPL_SOMALI"], []],
      ["Aden", "non_hereditary_patronymic", ["PPL_SOMALI"], ["Adan"]],
      ["Youssouf", "non_hereditary_patronymic", ["PPL_SOMALI"], ["Yusuf"]],
      ["Ismail", "non_hereditary_patronymic", ["PPL_SOMALI"], []],
      ["Ali", "non_hereditary_patronymic", ["PPL_AFAR"], []],
      ["Waberi", "non_hereditary_patronymic", ["PPL_SOMALI"], []],
      ["Bouh", "non_hereditary_patronymic", ["PPL_SOMALI"], []],
      ["Kamil", "non_hereditary_patronymic", ["PPL_AFAR"], []],
      ["Robleh", "non_hereditary_patronymic", ["PPL_SOMALI"], ["Roble"]],
    ],
  },

  SOM: {
    dominantNameSystem: "non_hereditary_patronymic",
    onomasticNote:
      "Le nom est une chaîne (prénom + père + grand-père) ; l'identité collective passe par le " +
      "qabiil (Darod, Hawiye, Isaaq), récité en généalogie mais jamais porté comme nom de famille. " +
      "Confondre les deux est l'erreur classique des états civils étrangers.",
    verificationLead:
      "Registre d'état civil somalien, travaux d'anthropologie sur les généalogies qabiil (abtirsiimo)",
    names: [
      ["Mohamed", "non_hereditary_patronymic", ["PPL_SOMALI"], ["Maxamed"]],
      ["Ahmed", "non_hereditary_patronymic", ["PPL_SOMALI"], ["Axmed"]],
      ["Hassan", "non_hereditary_patronymic", ["PPL_SOMALI"], ["Xasan"]],
      ["Farah", "non_hereditary_patronymic", ["PPL_SOMALI"], []],
      ["Abdi", "non_hereditary_patronymic", ["PPL_SOMALI"], []],
      ["Ali", "non_hereditary_patronymic", ["PPL_SOMALI"], []],
      ["Warsame", "non_hereditary_patronymic", ["PPL_SOMALI"], []],
      ["Jama", "non_hereditary_patronymic", ["PPL_SOMALI"], []],
      ["Nur", "non_hereditary_patronymic", ["PPL_SOMALI"], ["Nuur"]],
      ["Darod", "clan_name", ["PPL_SOMALI"], ["Daarood"]],
      ["Hawiye", "clan_name", ["PPL_SOMALI"], []],
      ["Isaaq", "clan_name", ["PPL_SOMALI"], ["Isaq"]],
    ],
  },

  KEN: {
    dominantNameSystem: "non_hereditary_patronymic",
    onomasticNote:
      "Trois logiques : le kikuyu recycle les noms des grands-parents, le luo nomme selon le " +
      "moment de la naissance (Otieno = né la nuit, Ochieng = né le jour), le kalenjin préfixe " +
      "Kip- (garçon) ou Che- (fille). Aucune n'est un patronyme héréditaire d'origine. " +
      "Le luo marque en outre le genre par le préfixe : O- pour les hommes (Otieno, Onyango), " +
      "A- pour les femmes (Akinyi) sur la même racine temporelle. Le gusii fait exception avec " +
      "des noms de clan transmis (Nyakundi), seuls classés ici en nom de clan.",
    verificationLead:
      "KNBS (recensement), IEBC voter register, travaux sur l'anthroponymie luo et kikuyu",
    names: [
      ["Kamau", "non_hereditary_patronymic", ["PPL_KIKUYU"], []],
      ["Njoroge", "non_hereditary_patronymic", ["PPL_KIKUYU"], []],
      ["Mwangi", "non_hereditary_patronymic", ["PPL_KIKUYU"], []],
      ["Wanjiru", "non_hereditary_patronymic", ["PPL_KIKUYU"], []],
      ["Otieno", "non_hereditary_patronymic", ["PPL_LUO"], []],
      ["Ochieng", "non_hereditary_patronymic", ["PPL_LUO"], ["Ochieng'"]],
      ["Odhiambo", "non_hereditary_patronymic", ["PPL_LUO"], []],
      ["Kiprotich", "non_hereditary_patronymic", ["PPL_KALENJIN"], []],
      ["Kipchoge", "non_hereditary_patronymic", ["PPL_KALENJIN"], []],
      ["Wafula", "non_hereditary_patronymic", ["PPL_LUHYA"], []],
      ["Mutua", "non_hereditary_patronymic", ["PPL_KAMBA"], []],
      ["Kimani", "non_hereditary_patronymic", ["PPL_KIKUYU"], []],
      ["Njeri", "non_hereditary_patronymic", ["PPL_KIKUYU"], []],
      ["Karanja", "non_hereditary_patronymic", ["PPL_KIKUYU"], []],
      ["Onyango", "non_hereditary_patronymic", ["PPL_LUO"], []],
      ["Akinyi", "non_hereditary_patronymic", ["PPL_LUO"], []],
      ["Chebet", "non_hereditary_patronymic", ["PPL_KALENJIN"], []],
      ["Mutiso", "non_hereditary_patronymic", ["PPL_KAMBA"], []],
      ["Nyakundi", "clan_name", ["PPL_KISII"], []],
      ["Katana", "non_hereditary_patronymic", ["PPL_MIJIKENDA"], []],
    ],
  },

  TZA: {
    dominantNameSystem: "non_hereditary_patronymic",
    onomasticNote:
      "La côte swahilie suit la chaîne patronymique arabo-musulmane ; l'intérieur chagga, " +
      "sukuma et haya porte des noms de lignage hérités (Kimaro, Massawe, Shayo).",
    verificationLead:
      "NBS Tanzania (sensa), RITA (état civil), travaux sur l'onomastique swahilie et chagga",
    names: [
      ["Juma", "non_hereditary_patronymic", ["PPL_SWAHILI"], []],
      ["Hassan", "non_hereditary_patronymic", ["PPL_SWAHILI"], []],
      ["Mohamed", "non_hereditary_patronymic", ["PPL_SWAHILI"], []],
      ["Said", "non_hereditary_patronymic", ["PPL_SWAHILI"], ["Sayid"]],
      ["Ally", "non_hereditary_patronymic", ["PPL_SWAHILI"], ["Ali"]],
      ["Kimaro", "clan_name", [], []],
      ["Massawe", "clan_name", [], []],
      ["Shayo", "clan_name", [], []],
      ["Mwakasege", "clan_name", [], []],
      ["Nyerere", "clan_name", ["PPL_NYAMWEZI"], []],
      ["Masanja", "clan_name", ["PPL_SUKUMA"], []],
      ["Rutasitara", "clan_name", ["PPL_HAYA"], []],
      ["Mwinyi", "clan_name", ["PPL_SWAHILI"], []],
      ["Mkapa", "clan_name", ["PPL_MAKONDE"], []],
      ["Kikwete", "clan_name", ["PPL_ZARAMO"], []],
      ["Magufuli", "clan_name", ["PPL_SUKUMA"], []],
      ["Mwaipopo", "clan_name", ["PPL_NYAKYUSA"], []],
      ["Lyimo", "clan_name", ["PPL_CHAGA"], []],
      ["Mrema", "clan_name", ["PPL_CHAGA"], []],
      ["Sokoine", "clan_name", ["PPL_MAASAI"], []],
    ],
  },

  UGA: {
    dominantNameSystem: "totemic_clan",
    onomasticNote:
      "Le Buganda est le cas totémique du corpus : l'ekika est une liste fermée de clans à " +
      "totem animal ou végétal, et chaque clan détient un stock de noms (amannya g'ekika) que " +
      "seuls ses membres peuvent porter. Le nord acholi et langi suit une logique tout autre. " +
      "Les noms de jumeaux font exception dans les deux sens : Wasswa et Kato pour les garçons, " +
      "Babirye et Nakato pour les filles, sont attribués par le rang de naissance et non tirés " +
      "du stock de l'ekika — ils restent classés en clan totémique faute de valeur plus proche. " +
      "Le préfixe Na- marque le féminin (Lubega / Nalubega). Le luo du nord a sa propre paire " +
      "de jumeaux, Opio, sur un système sans rapport avec l'ekika.",
    verificationLead:
      "UBOS (recensement), Buganda Kingdom clan registers, travaux sur l'ekika ganda",
    names: [
      ["Mukasa", "totemic_clan", ["PPL_BAGANDA"], []],
      ["Ssemakula", "totemic_clan", ["PPL_BAGANDA"], ["Semakula"]],
      ["Lubega", "totemic_clan", ["PPL_BAGANDA"], []],
      ["Nsubuga", "totemic_clan", ["PPL_BAGANDA"], []],
      ["Kigozi", "totemic_clan", ["PPL_BAGANDA"], []],
      ["Ssentongo", "totemic_clan", ["PPL_BAGANDA"], ["Sentongo"]],
      ["Kizza", "totemic_clan", ["PPL_BAGANDA"], ["Kiza"]],
      ["Wasswa", "totemic_clan", ["PPL_BAGANDA"], ["Waswa"]],
      ["Nakato", "totemic_clan", ["PPL_BAGANDA"], []],
      ["Okello", "non_hereditary_patronymic", ["PPL_ACHOLI"], []],
      ["Ocen", "non_hereditary_patronymic", ["PPL_LANGO"], ["Ochen"]],
      ["Byaruhanga", "clan_name", ["PPL_BANYANKOLE"], []],
      ["Kaggwa", "totemic_clan", ["PPL_BAGANDA"], []],
      ["Kiwanuka", "totemic_clan", ["PPL_BAGANDA"], []],
      ["Nalubega", "totemic_clan", ["PPL_BAGANDA"], []],
      ["Kato", "totemic_clan", ["PPL_BAGANDA"], []],
      ["Babirye", "totemic_clan", ["PPL_BAGANDA"], []],
      ["Museveni", "clan_name", ["PPL_BANYANKOLE"], []],
      ["Ojok", "non_hereditary_patronymic", ["PPL_ACHOLI"], []],
      ["Opio", "non_hereditary_patronymic", ["PPL_LANGO"], ["Opiyo"]],
    ],
  },

  RWA: {
    dominantNameSystem: "non_hereditary_patronymic",
    onomasticNote:
      "Le nom rwandais (izina) est attribué individuellement à chaque enfant et n'est ni hérité " +
      "du père ni partagé par la fratrie : frères et sœurs portent des noms différents. La " +
      "classification retenue est la moins mauvaise des cinq, pas une description exacte.",
    verificationLead:
      "NISR (recensement), NIDA (état civil), travaux sur le système des amazina rwandais",
    names: [
      ["Kagame", "non_hereditary_patronymic", ["PPL_KINYARWANDA"], []],
      ["Habyarimana", "non_hereditary_patronymic", ["PPL_KINYARWANDA"], []],
      ["Uwimana", "non_hereditary_patronymic", ["PPL_KINYARWANDA"], []],
      ["Mukamana", "non_hereditary_patronymic", ["PPL_KINYARWANDA"], []],
      ["Nsengiyumva", "non_hereditary_patronymic", ["PPL_KINYARWANDA"], []],
      ["Bizimana", "non_hereditary_patronymic", ["PPL_KINYARWANDA"], []],
      ["Niyonzima", "non_hereditary_patronymic", ["PPL_KINYARWANDA"], []],
      ["Munyaneza", "non_hereditary_patronymic", ["PPL_KINYARWANDA"], []],
      ["Rwigema", "non_hereditary_patronymic", ["PPL_KINYARWANDA"], []],
      ["Uwase", "non_hereditary_patronymic", ["PPL_KINYARWANDA"], []],
      ["Nkurunziza", "non_hereditary_patronymic", ["PPL_KINYARWANDA"], []],
      ["Mugisha", "non_hereditary_patronymic", ["PPL_KINYARWANDA"], []],
    ],
  },

  BDI: {
    dominantNameSystem: "non_hereditary_patronymic",
    onomasticNote:
      "Même système qu'au Rwanda : izina individuel, souvent une phrase kirundi sur Dieu ou " +
      "les circonstances de la naissance (Hakizimana, « Dieu sauve »).",
    verificationLead:
      "ISTEEBU (recensement), état civil burundais, travaux sur les amazina kirundi",
    names: [
      ["Ndayizeye", "non_hereditary_patronymic", ["PPL_RUNDI"], []],
      ["Nkurunziza", "non_hereditary_patronymic", ["PPL_RUNDI"], []],
      ["Hakizimana", "non_hereditary_patronymic", ["PPL_RUNDI"], []],
      ["Bigirimana", "non_hereditary_patronymic", ["PPL_RUNDI"], []],
      ["Niyonkuru", "non_hereditary_patronymic", ["PPL_RUNDI"], []],
      ["Nsabimana", "non_hereditary_patronymic", ["PPL_RUNDI"], []],
      ["Manirakiza", "non_hereditary_patronymic", ["PPL_RUNDI"], []],
      ["Ndikumana", "non_hereditary_patronymic", ["PPL_RUNDI"], []],
      ["Irakoze", "non_hereditary_patronymic", ["PPL_RUNDI"], []],
      ["Nduwimana", "non_hereditary_patronymic", ["PPL_RUNDI"], []],
      ["Bukuru", "non_hereditary_patronymic", ["PPL_RUNDI"], []],
      ["Ntibantunganya", "non_hereditary_patronymic", ["PPL_RUNDI"], []],
    ],
  },

  // ===========================================================================
  // Afrique australe
  // ===========================================================================
  ZAF: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Le nom de famille nguni et l'isiduko (nom de clan) sont deux choses différentes : on " +
      "demande « ubuhlobo bakho ? » pour l'isiduko, jamais le patronyme d'état civil. " +
      "Les patronymes afrikaans et anglais forment une strate coloniale distincte. " +
      "Mandela et Madiba sont queués séparément parce qu'ils illustrent précisément cette " +
      "différence : Mandela est le nom d'état civil, Madiba l'isiduko du même homme. Les deux " +
      "portent la valeur clan_name, qui ne distingue pas les deux registres — une limite du " +
      "vocabulaire à trancher à la revue, pas une équivalence.",
    verificationLead:
      "Stats SA (recensement), Department of Home Affairs, travaux sur l'isiduko xhosa et les izithakazelo zoulou",
    names: [
      ["Dlamini", "clan_name", ["PPL_ZULU"], []],
      ["Nkosi", "clan_name", ["PPL_ZULU"], []],
      ["Ndlovu", "clan_name", ["PPL_ZULU"], []],
      ["Khumalo", "clan_name", ["PPL_ZULU"], []],
      ["Mthethwa", "clan_name", ["PPL_ZULU"], []],
      ["Nxumalo", "clan_name", ["PPL_ZULU"], []],
      ["Sithole", "clan_name", ["PPL_ZULU"], []],
      ["Mokoena", "totemic_clan", ["PPL_SOTHO"], []],
      ["Molefe", "clan_name", ["PPL_TSWANA"], []],
      ["Mahlangu", "clan_name", ["PPL_NDEBELE"], []],
      ["Mabaso", "clan_name", ["PPL_ZULU"], []],
      ["Ngcobo", "clan_name", ["PPL_XHOSA"], []],
      ["Mandela", "clan_name", ["PPL_XHOSA"], []],
      ["Madiba", "clan_name", ["PPL_XHOSA"], []],
      ["Mbeki", "clan_name", ["PPL_XHOSA"], []],
      ["Zuma", "clan_name", ["PPL_ZULU"], []],
      ["Ramaphosa", "clan_name", ["PPL_VENDA"], []],
      ["Motsepe", "clan_name", ["PPL_TSWANA"], []],
      ["Baloyi", "clan_name", ["PPL_TSONGA"], []],
      ["Mabuza", "clan_name", ["PPL_SWAZI"], []],
    ],
  },

  LSO: {
    dominantNameSystem: "totemic_clan",
    onomasticNote:
      "Le seboko sotho est un totem animal : Bakoena (crocodile), Bataung (lion), Bafokeng " +
      "(rosée). Mokoena signifie « celui du crocodile » — le nom porte le totem, pas un ancêtre.",
    verificationLead:
      "Bureau of Statistics Lesotho, registre d'état civil, travaux sur les liboko sotho",
    names: [
      ["Mokoena", "totemic_clan", ["PPL_SOTHO"], []],
      ["Molefe", "totemic_clan", ["PPL_SOTHO"], []],
      ["Letsie", "clan_name", ["PPL_SOTHO_SUD"], []],
      ["Thabane", "clan_name", ["PPL_SOTHO_SUD"], []],
      ["Mosisili", "clan_name", ["PPL_SOTHO_SUD"], []],
      ["Lekhanya", "clan_name", ["PPL_SOTHO_SUD"], []],
      ["Mohale", "clan_name", ["PPL_SOTHO_SUD"], []],
      ["Ramaema", "clan_name", ["PPL_SOTHO_SUD"], []],
      ["Khoabane", "clan_name", ["PPL_SOTHO_SUD"], []],
      ["Maseribane", "clan_name", ["PPL_SOTHO_SUD"], []],
      ["Motsoahae", "clan_name", ["PPL_SOTHO_SUD"], []],
      ["Sekhonyana", "clan_name", ["PPL_SOTHO_SUD"], []],
    ],
  },

  SWZ: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Dlamini est le clan royal et le patronyme le plus porté du pays : une concentration " +
      "onomastique sans équivalent ailleurs sur le continent. Chaque clan a ses tinanatelo (louanges).",
    verificationLead:
      "Central Statistical Office Eswatini, registre d'état civil, travaux sur les tinanatelo swazi",
    names: [
      ["Dlamini", "clan_name", ["PPL_SWAZI"], []],
      ["Nkosi", "clan_name", ["PPL_SWAZI"], []],
      ["Mamba", "totemic_clan", ["PPL_SWAZI"], []],
      ["Simelane", "clan_name", ["PPL_SWAZI"], []],
      ["Shongwe", "clan_name", ["PPL_SWAZI"], []],
      ["Magagula", "clan_name", ["PPL_SWAZI"], []],
      ["Zwane", "clan_name", ["PPL_SWAZI"], []],
      ["Hlophe", "clan_name", ["PPL_SWAZI"], []],
      ["Matsebula", "clan_name", ["PPL_SWAZI"], []],
      ["Ginindza", "clan_name", ["PPL_SWAZI"], []],
      ["Gamedze", "clan_name", ["PPL_SWAZI"], []],
      ["Vilakati", "clan_name", ["PPL_SWAZI"], []],
    ],
  },

  BWA: {
    dominantNameSystem: "totemic_clan",
    onomasticNote:
      "Le totem tswana (seano) nomme le groupe : Bakwena (crocodile), Bangwato (duiker), " +
      "Batawana. Le patronyme d'état civil, lui, dérive souvent d'un prénom d'ancêtre.",
    verificationLead:
      "Statistics Botswana, registre d'état civil, travaux sur les merafe et leurs seano",
    names: [
      ["Khama", "clan_name", ["PPL_TSWANA"], []],
      ["Molefe", "totemic_clan", ["PPL_TSWANA"], []],
      ["Modise", "clan_name", ["PPL_TSWANA"], []],
      ["Masire", "clan_name", ["PPL_TSWANA"], []],
      ["Mogae", "clan_name", ["PPL_TSWANA"], []],
      ["Masisi", "clan_name", ["PPL_TSWANA"], []],
      ["Seretse", "clan_name", ["PPL_TSWANA"], []],
      ["Moeti", "clan_name", ["PPL_TSWANA"], []],
      ["Sebego", "clan_name", ["PPL_TSWANA"], []],
      ["Mmusi", "clan_name", ["PPL_TSWANA"], []],
      ["Kgosi", "clan_name", ["PPL_TSWANA"], []],
      ["Mothibi", "clan_name", ["PPL_TSWANA"], []],
    ],
  },

  NAM: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Trois strates : noms ovambo (Nujoma, Shikongo), noms nama et damara à clic (Witbooi, " +
      "ǁGaroëb), et patronymes afrikaans hérités de l'administration sud-africaine.",
    verificationLead:
      "Namibia Statistics Agency, Ministry of Home Affairs, travaux sur l'onomastique ovambo et nama",
    names: [
      ["Nujoma", "clan_name", ["PPL_OVAMBO"], []],
      ["Shikongo", "clan_name", ["PPL_OVAMBO"], []],
      ["Amadhila", "clan_name", ["PPL_OVAMBO"], []],
      ["Hamutenya", "clan_name", ["PPL_OVAMBO"], []],
      ["Iipumbu", "clan_name", ["PPL_OVAMBO"], []],
      ["Pohamba", "clan_name", ["PPL_OVAMBO"], []],
      ["Geingob", "clan_name", ["PPL_DAMARA"], []],
      ["Witbooi", "clan_name", ["PPL_NAMA"], []],
      ["Kaapanda", "clan_name", ["PPL_OVAMBO"], []],
      ["Riruako", "clan_name", ["PPL_HERERO"], []],
      ["Tjiriange", "clan_name", ["PPL_HERERO"], []],
      ["Nghidinwa", "clan_name", ["PPL_OVAMBO"], []],
    ],
  },

  ZWE: {
    dominantNameSystem: "totemic_clan",
    onomasticNote:
      "Le mutupo shona est un totem : Moyo (cœur), Shumba (lion), Soko (singe). Il gouverne " +
      "l'exogamie et se récite en salutation. Les patronymes ndebele du Matabeleland (Ncube, " +
      "Sibanda, Ndlovu) relèvent, eux, du système nguni.",
    verificationLead:
      "ZIMSTAT (recensement), Registrar General, travaux sur le mutupo shona et les isibongo ndebele",
    names: [
      ["Moyo", "totemic_clan", ["PPL_SHONA"], []],
      ["Ncube", "clan_name", ["PPL_NDEBELE"], []],
      ["Sibanda", "clan_name", ["PPL_NDEBELE"], []],
      ["Ndlovu", "clan_name", ["PPL_NDEBELE"], []],
      ["Dube", "clan_name", ["PPL_NDEBELE"], []],
      ["Mpofu", "clan_name", ["PPL_NDEBELE"], []],
      ["Shumba", "totemic_clan", ["PPL_SHONA"], []],
      ["Soko", "totemic_clan", ["PPL_SHONA"], []],
      ["Mugabe", "clan_name", ["PPL_SHONA"], []],
      ["Mnangagwa", "clan_name", ["PPL_SHONA"], []],
      ["Chirwa", "clan_name", [], []],
      ["Nyoni", "totemic_clan", ["PPL_NDEBELE"], []],
    ],
  },

  ZMB: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Banda et Phiri, les deux patronymes les plus portés, débordent largement la Zambie : " +
      "ils sont partagés avec le Malawi et le Mozambique, héritage de la diaspora ngoni et chewa.",
    verificationLead:
      "Zambia Statistics Agency, Department of National Registration, travaux sur les mikowa bemba",
    names: [
      ["Banda", "clan_name", ["PPL_CHEWA"], []],
      ["Phiri", "clan_name", ["PPL_CHEWA"], []],
      ["Mwanza", "clan_name", [], []],
      ["Tembo", "clan_name", ["PPL_NGONI"], []],
      ["Zulu", "clan_name", ["PPL_NGONI"], []],
      ["Mulenga", "clan_name", ["PPL_BEMBA"], []],
      ["Chanda", "clan_name", ["PPL_BEMBA"], []],
      ["Bwalya", "clan_name", ["PPL_BEMBA"], []],
      ["Musonda", "clan_name", ["PPL_BEMBA"], []],
      ["Sakala", "clan_name", ["PPL_CHEWA"], []],
      ["Lungu", "clan_name", [], []],
      ["Mwale", "clan_name", ["PPL_CHEWA"], []],
    ],
  },

  MWI: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Le sud chewa est matrilinéaire, le nord tumbuka et ngoni patrilinéaire : un même " +
      "patronyme n'y désigne donc pas la même chose selon la région où il est porté.",
    verificationLead:
      "National Statistical Office Malawi, National Registration Bureau, travaux sur le matriliniat chewa",
    names: [
      ["Banda", "clan_name", ["PPL_CHEWA"], []],
      ["Phiri", "clan_name", ["PPL_CHEWA"], []],
      ["Mwale", "clan_name", ["PPL_CHEWA"], []],
      ["Chirwa", "clan_name", ["PPL_TUMBUKA"], []],
      ["Nyirenda", "clan_name", ["PPL_TUMBUKA"], []],
      ["Gondwe", "clan_name", ["PPL_TUMBUKA"], []],
      ["Mhango", "clan_name", ["PPL_TUMBUKA"], []],
      ["Kamanga", "clan_name", ["PPL_TUMBUKA"], []],
      ["Msiska", "clan_name", ["PPL_TUMBUKA"], []],
      ["Zulu", "clan_name", ["PPL_NGONI"], []],
      ["Manda", "clan_name", ["PPL_TUMBUKA"], []],
      ["Kachale", "clan_name", ["PPL_CHEWA"], []],
    ],
  },

  MOZ: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Patronymes portugais imposés à l'assimilação, sous lesquels subsistent des noms makua, " +
      "tsonga et sena (Machel, Sitoe, Macuácua). Le nord makua est matrilinéaire.",
    verificationLead:
      "INE Moçambique (recenseamento), Conservatória, travaux sur l'onomastique makua et tsonga",
    names: [
      ["Machel", "clan_name", ["PPL_TSONGA"], []],
      ["Chissano", "clan_name", ["PPL_TSONGA"], []],
      ["Nyusi", "clan_name", ["PPL_MAKUA"], []],
      ["Guebuza", "clan_name", [], []],
      ["Mondlane", "clan_name", ["PPL_TSONGA"], []],
      ["Dhlakama", "clan_name", ["PPL_NDAU"], []],
      ["Cossa", "clan_name", ["PPL_TSONGA"], []],
      ["Sitoe", "clan_name", ["PPL_TSONGA"], []],
      ["Macuácua", "clan_name", ["PPL_TSONGA"], ["Macuacua"]],
      ["Simango", "clan_name", ["PPL_SENA"], []],
      ["Mabote", "clan_name", ["PPL_TSONGA"], []],
      ["Nhaca", "clan_name", ["PPL_TSONGA"], []],
      ["dos Santos", "clan_name", [], ["Santos"]],
      ["Matsinhe", "clan_name", ["PPL_TSONGA"], []],
      ["Chirindza", "clan_name", ["PPL_TSONGA"], []],
      ["Mucavele", "clan_name", ["PPL_TSONGA"], []],
      ["Chiziane", "clan_name", ["PPL_TSONGA"], []],
      ["Mocumbi", "clan_name", ["PPL_TSWA"], []],
      ["Chipande", "clan_name", ["PPL_MAKONDE"], []],
      ["Momade", "non_hereditary_patronymic", ["PPL_MAKUA"], ["Mamade"]],
    ],
  },

  // ===========================================================================
  // Afrique du Nord
  // ===========================================================================
  MAR: {
    dominantNameSystem: "nisba",
    onomasticNote:
      "La nisba domine : el-Fassi (de Fès), el-Alaoui (des Alaouites), er-Rifi (du Rif). " +
      "Elle dit une ville, une tribu ou une lignée chérifienne, et se transmet — contrairement " +
      "au nasab (« ben X ») qui, lui, désigne le père. Certaines nisba ne disent pas un lieu " +
      "marocain mais une origine étrangère devenue héréditaire : Sqalli (de Sicile) et " +
      "El Andalousi (d'al-Andalus) datent des expulsions ibériques, et font du patronyme une " +
      "trace de migration.",
    verificationLead:
      "HCP Maroc (RGPH), état civil, travaux sur les nisba et les patronymes amazighs",
    names: [
      ["El Alami", "nisba", ["PPL_ARABES_AFRIQUE"], ["Alami"]],
      ["Alaoui", "nisba", ["PPL_ARABES_AFRIQUE"], ["El Alaoui"]],
      ["Idrissi", "nisba", ["PPL_ARABES_AFRIQUE"], ["El Idrissi"]],
      ["Fassi", "nisba", ["PPL_ARABES_AFRIQUE"], ["El Fassi"]],
      ["Bennani", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Benjelloun", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Tazi", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Berrada", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Ouazzani", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Amrani", "nisba", ["PPL_AMAZIGH_MACRO"], []],
      ["Aït Ahmed", "clan_name", ["PPL_CHLEUH"], ["Ait Ahmed"]],
      ["Rifi", "nisba", ["PPL_RIFAIN"], ["Er-Rifi"]],
      ["Benkirane", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Chraïbi", "nisba", ["PPL_ARABES_AFRIQUE"], ["Chraibi"]],
      ["Lahlou", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Doukkali", "nisba", ["PPL_ARABES_AFRIQUE"], ["El Doukkali"]],
      ["Sqalli", "nisba", ["PPL_ARABES_AFRIQUE"], ["Squalli"]],
      ["El Andalousi", "nisba", ["PPL_ARABES_AFRIQUE"], ["Andaloussi"]],
      ["Khattabi", "nisba", ["PPL_RIFAIN"], ["El Khattabi"]],
      ["Akhannouch", "clan_name", ["PPL_CHLEUH"], ["Akhenouch"]],
    ],
  },

  DZA: {
    dominantNameSystem: "nisba",
    onomasticNote:
      "L'état civil de 1882 a imposé des patronymes fixes à une population qui n'en portait pas : " +
      "beaucoup de noms algériens datent de cette opération administrative, parfois attribués " +
      "arbitrairement voire par dérision. Les noms kabyles en Aït- ou At- marquent, eux, le lignage.",
    verificationLead:
      "ONS Algérie (RGPH), état civil, travaux sur l'état civil colonial de 1882 et l'onomastique kabyle",
    names: [
      ["Benali", "nisba", ["PPL_ARABES_AFRIQUE"], ["Ben Ali"]],
      ["Boumediene", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Belkacem", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Meziane", "nisba", ["PPL_KABYLE"], []],
      ["Amrani", "nisba", ["PPL_AMAZIGH_MACRO"], []],
      ["Hamdi", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Saidi", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Bouzid", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Kaci", "clan_name", ["PPL_KABYLE"], []],
      ["Aït Ahmed", "clan_name", ["PPL_KABYLE"], ["Ait Ahmed"]],
      ["Ouyahia", "clan_name", ["PPL_KABYLE"], []],
      ["Benyoucef", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Bouteflika", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Ben Badis", "nisba", ["PPL_ARABES_AFRIQUE"], ["Benbadis"]],
      ["Cherif", "nisba", ["PPL_ARABES_AFRIQUE"], ["Chérif"]],
      ["Amara", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Haddad", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Zeroual", "nisba", ["PPL_CHAOUI"], ["Zéroual"]],
      ["Aït Menguellet", "clan_name", ["PPL_KABYLE"], ["Ait Menguellet"]],
      ["Mammeri", "clan_name", ["PPL_KABYLE"], []],
    ],
  },

  TUN: {
    dominantNameSystem: "nisba",
    onomasticNote:
      "Nisba toponymiques (Jendoubi, Sfaxi, Gabsi) et tribales (Trabelsi, Hammami). " +
      "L'état civil tunisien fixe les patronymes depuis 1957, plus tard que l'Algérie.",
    verificationLead:
      "INS Tunisie (recensement), état civil, travaux sur les nisba toponymiques tunisiennes",
    names: [
      ["Ben Ali", "nisba", ["PPL_ARABES_AFRIQUE"], ["Benali"]],
      ["Trabelsi", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Gharbi", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Jendoubi", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Mejri", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Sassi", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Ayari", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Hamdi", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Khelifi", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Chaabane", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Bouazizi", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Ben Salah", "nisba", ["PPL_ARABES_AFRIQUE"], []],
    ],
  },

  LBY: {
    dominantNameSystem: "nisba",
    onomasticNote:
      "L'identité tribale prime : Warfalli, Zintani, Misrati, Obeidi sont des nisba de tribu ou " +
      "de ville, et structurent la vie politique autant que l'état civil.",
    verificationLead:
      "Bureau of Statistics and Census Libya, état civil, travaux sur les tribus libyennes",
    names: [
      ["Al-Warfalli", "nisba", ["PPL_ARABES_AFRIQUE"], ["Warfalli"]],
      ["Al-Zintani", "nisba", ["PPL_ARABES_AFRIQUE"], ["Zintani"]],
      ["Al-Misrati", "nisba", ["PPL_ARABES_AFRIQUE"], ["Misrati"]],
      ["Al-Obeidi", "nisba", ["PPL_ARABES_AFRIQUE"], ["Obeidi"]],
      ["Al-Senussi", "nisba", ["PPL_ARABES_AFRIQUE"], ["Senussi"]],
      ["Al-Magarief", "nisba", ["PPL_ARABES_AFRIQUE"], ["Magarief"]],
      ["Al-Gaddafi", "nisba", ["PPL_ARABES_AFRIQUE"], ["Kadhafi", "Qadhadhfa"]],
      ["Al-Mismari", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Al-Ghariani", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Tarhouni", "nisba", ["PPL_ARABES_AFRIQUE"], []],
      ["Al-Zawi", "nisba", ["PPL_ARABES_AFRIQUE"], ["Zawi"]],
      ["Bin Nasr", "non_hereditary_patronymic", ["PPL_ARABES_AFRIQUE"], []],
    ],
  },

  EGY: {
    dominantNameSystem: "non_hereditary_patronymic",
    onomasticNote:
      "Le nom égyptien est une chaîne de prénoms (ism + nom du père + du grand-père) ; " +
      "le nom de famille fixe reste minoritaire hors des grandes familles et des Coptes. " +
      "Les noms coptes (Shenouda, Guirguis, Boutros, Bishara, Tadros) et le nom d'origine " +
      "circassienne Abaza sont queués sans peopleIds : le corpus ne porte aucune fiche de " +
      "peuple pour les Coptes ni pour la strate ottomane, et les rattacher à PPL_ARABES_AFRIQUE " +
      "serait un classement faux plutôt qu'un champ vide. La nisba, elle, fait tenir la " +
      "diversité que la chaîne de prénoms masque : elle dit une ville (El Fayoumi), une origine " +
      "amazighe de Haute-Égypte (El Hawary, des Hawwara), une oasis (El Siwi), un groupe bedja " +
      "(Ababda, Bishari) ou une des deux populations nubiennes (El Kenzi, Fadicca).",
    verificationLead:
      "CAPMAS (recensement), état civil, travaux sur l'onomastique arabe et copte d'Égypte",
    names: [
      [
        "Mohamed",
        "non_hereditary_patronymic",
        ["PPL_ARABES_AFRIQUE"],
        ["Muhammad"],
      ],
      ["Ahmed", "non_hereditary_patronymic", ["PPL_ARABES_AFRIQUE"], []],
      ["Hassan", "non_hereditary_patronymic", ["PPL_ARABES_AFRIQUE"], []],
      ["Ibrahim", "non_hereditary_patronymic", ["PPL_ARABES_AFRIQUE"], []],
      ["Mahmoud", "non_hereditary_patronymic", ["PPL_ARABES_AFRIQUE"], []],
      ["Ali", "non_hereditary_patronymic", ["PPL_ARABES_AFRIQUE"], []],
      ["El Sayed", "nisba", ["PPL_ARABES_AFRIQUE"], ["Al-Sayed"]],
      ["Abdel Rahman", "non_hereditary_patronymic", ["PPL_ARABES_AFRIQUE"], []],
      [
        "Mostafa",
        "non_hereditary_patronymic",
        ["PPL_ARABES_AFRIQUE"],
        ["Mustafa"],
      ],
      ["Saleh", "non_hereditary_patronymic", ["PPL_ARABES_AFRIQUE"], []],
      ["Abdallah", "non_hereditary_patronymic", ["PPL_ARABES_AFRIQUE"], []],
      ["Nubi", "nisba", ["PPL_NUBIENS"], ["El Nubi"]],
      [
        "Youssef",
        "non_hereditary_patronymic",
        ["PPL_ARABES_AFRIQUE"],
        ["Yusuf"],
      ],
      ["Abdel Aziz", "non_hereditary_patronymic", ["PPL_ARABES_AFRIQUE"], []],
      ["El Masry", "nisba", ["PPL_ARABES_AFRIQUE"], ["Al-Masri"]],
      ["El Sherbini", "nisba", ["PPL_ARABES_AFRIQUE"], ["Sherbini"]],
      ["El Mansoury", "nisba", ["PPL_ARABES_AFRIQUE"], ["Mansouri"]],
      ["El Fayoumi", "nisba", ["PPL_ARABES_AFRIQUE"], ["Fayoumi"]],
      ["El Hawary", "nisba", ["PPL_AMAZIGH_MACRO"], ["Hawary"]],
      ["El Siwi", "nisba", ["PPL_SIWI"], ["Siwi"]],
      ["Ababda", "nisba", ["PPL_BEJA"], ["Ababdeh"]],
      ["Bishari", "nisba", ["PPL_BEJA"], ["Bisharin"]],
      ["El Kenzi", "nisba", ["PPL_NUBIENS"], ["Kenzi"]],
      ["Fadicca", "nisba", ["PPL_NUBIENS"], ["Fadija"]],
      ["Shenouda", "clan_name", [], []],
      ["Guirguis", "clan_name", [], ["Girgis"]],
      ["Boutros", "clan_name", [], ["Botros"]],
      ["Bishara", "clan_name", [], []],
      ["Tadros", "clan_name", [], []],
      ["Abaza", "clan_name", [], []],
    ],
  },

  // ===========================================================================
  // Îles
  // ===========================================================================
  MDG: {
    dominantNameSystem: "non_hereditary_patronymic",
    onomasticNote:
      "L'anarana malgache est un composé long, souvent préfixé Ra- (honorifique) ou " +
      "Andrian- (noble), et n'est pas hérité de manière systématique : les cinq systèmes du " +
      "modèle décrivent mal ce cas, la classification est provisoire. Le préfixe Ra- est de " +
      "surcroît une marque des hautes terres : les noms côtiers queués ici (Zafy et Tsiranana " +
      "chez les Tsimihety, Monja chez les Antandroy, Tsiaraso chez les Sakalava) s'en passent, " +
      "et une liste qui ne retiendrait que des Ra- ferait passer l'anthroponymie merina pour " +
      "celle de l'île entière.",
    verificationLead:
      "INSTAT Madagascar (RGPH), état civil, travaux sur l'anarana et les préfixes Ra-/Andrian-",
    names: [
      ["Rakotomalala", "non_hereditary_patronymic", ["PPL_MERINA"], []],
      ["Randrianarisoa", "non_hereditary_patronymic", ["PPL_MERINA"], []],
      ["Rasoanaivo", "non_hereditary_patronymic", ["PPL_MERINA"], []],
      ["Razafindrakoto", "non_hereditary_patronymic", ["PPL_MERINA"], []],
      ["Rakotoarisoa", "non_hereditary_patronymic", ["PPL_MERINA"], []],
      ["Ravalomanana", "non_hereditary_patronymic", ["PPL_MERINA"], []],
      ["Rajoelina", "non_hereditary_patronymic", ["PPL_MERINA"], []],
      ["Ratsiraka", "non_hereditary_patronymic", ["PPL_BETSIMISARAKA"], []],
      ["Rabemananjara", "non_hereditary_patronymic", ["PPL_MERINA"], []],
      ["Randriamampionona", "non_hereditary_patronymic", ["PPL_MERINA"], []],
      ["Raharimanana", "non_hereditary_patronymic", ["PPL_BETSILEO"], []],
      ["Andriamanjato", "non_hereditary_patronymic", ["PPL_MERINA"], []],
      ["Rabearivelo", "non_hereditary_patronymic", ["PPL_MERINA"], []],
      ["Ranaivo", "non_hereditary_patronymic", ["PPL_MERINA"], []],
      ["Ramanantsoa", "non_hereditary_patronymic", ["PPL_MERINA"], []],
      ["Rajaonarimampianina", "non_hereditary_patronymic", ["PPL_MERINA"], []],
      ["Zafy", "non_hereditary_patronymic", ["PPL_TSIMIHETY"], []],
      ["Tsiranana", "non_hereditary_patronymic", ["PPL_TSIMIHETY"], []],
      ["Monja", "non_hereditary_patronymic", ["PPL_ANTANDROY"], []],
      ["Tsiaraso", "non_hereditary_patronymic", ["PPL_SAKALAVA"], []],
    ],
  },

  MUS: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Quatre strates sans recouvrement : patronymes indiens (Ramgoolam, Jugnauth), créoles " +
      "d'ascendance servile, franco-mauriciens et sino-mauriciens. Le nom dit la communauté, " +
      "et c'est précisément ce que l'histoire mauricienne a construit.",
    verificationLead:
      "Statistics Mauritius, Civil Status Division, travaux sur l'engagisme et l'onomastique indo-mauricienne",
    names: [
      ["Ramgoolam", "clan_name", ["PPL_INDO_MAURICIENS"], []],
      ["Jugnauth", "clan_name", ["PPL_INDO_MAURICIENS"], []],
      ["Boolell", "clan_name", ["PPL_INDO_MAURICIENS"], []],
      ["Seeruttun", "clan_name", ["PPL_INDO_MAURICIENS"], []],
      ["Gopaul", "clan_name", ["PPL_INDO_MAURICIENS"], []],
      ["Beeharry", "clan_name", ["PPL_INDO_MAURICIENS"], []],
      ["Appadoo", "clan_name", ["PPL_INDO_MAURICIENS"], []],
      ["Sooprayen", "clan_name", ["PPL_INDO_MAURICIENS"], []],
      ["Duval", "clan_name", ["PPL_CREOLE_MAURICE"], []],
      ["Bérenger", "clan_name", ["PPL_FRANCO_MAURICIENS"], ["Berenger"]],
      ["Curpen", "clan_name", ["PPL_INDO_MAURICIENS"], []],
      ["Ah Chuen", "clan_name", ["PPL_SINO_MAURICIENS"], []],
    ],
  },

  SYC: {
    dominantNameSystem: "clan_name",
    onomasticNote:
      "Patronymes français hérités des colons et de l'affranchissement, portés par une " +
      "population majoritairement créole : le nom ne dit rien de l'ascendance.",
    verificationLead:
      "National Bureau of Statistics Seychelles, Civil Status Office, travaux sur l'onomastique créole",
    names: [
      ["Michel", "clan_name", ["PPL_CREOLE_SEYCHELLES"], []],
      ["Faure", "clan_name", ["PPL_CREOLE_SEYCHELLES"], []],
      ["Payet", "clan_name", ["PPL_CREOLE_SEYCHELLES"], []],
      ["Hoareau", "clan_name", ["PPL_CREOLE_SEYCHELLES"], []],
      ["Julie", "clan_name", ["PPL_CREOLE_SEYCHELLES"], []],
      ["Confait", "clan_name", ["PPL_CREOLE_SEYCHELLES"], []],
      ["Ramkalawan", "clan_name", ["PPL_CREOLE_SEYCHELLES"], []],
      ["Adam", "clan_name", ["PPL_CREOLE_SEYCHELLES"], []],
      ["Rose", "clan_name", ["PPL_CREOLE_SEYCHELLES"], []],
      ["Barbé", "clan_name", ["PPL_CREOLE_SEYCHELLES"], ["Barbe"]],
      ["Larue", "clan_name", ["PPL_CREOLE_SEYCHELLES"], []],
      ["Loustau-Lalanne", "clan_name", ["PPL_CREOLE_SEYCHELLES"], []],
    ],
  },

  COM: {
    dominantNameSystem: "non_hereditary_patronymic",
    onomasticNote:
      "Chaîne de prénoms arabo-swahilie, où le nom du père sert de second élément. " +
      "Les titres shirazi et les lignages matrilinéaires comoriens ne passent pas par le patronyme.",
    verificationLead:
      "INSEED Comores, état civil, travaux sur les lignages matrilinéaires et l'héritage shirazi",
    names: [
      ["Abdallah", "non_hereditary_patronymic", ["PPL_COMORIEN"], []],
      ["Assoumani", "non_hereditary_patronymic", ["PPL_COMORIEN"], []],
      ["Sambi", "non_hereditary_patronymic", ["PPL_COMORIEN"], []],
      ["Djohar", "non_hereditary_patronymic", ["PPL_COMORIEN"], []],
      ["Soilihi", "non_hereditary_patronymic", ["PPL_COMORIEN"], []],
      ["Mohamed", "non_hereditary_patronymic", ["PPL_COMORIEN"], []],
      ["Said", "non_hereditary_patronymic", ["PPL_COMORIEN"], []],
      ["Ahmed", "non_hereditary_patronymic", ["PPL_COMORIEN"], []],
      ["Bacar", "non_hereditary_patronymic", ["PPL_COMORIEN"], []],
      ["Ali", "non_hereditary_patronymic", ["PPL_COMORIEN"], []],
      ["Youssouf", "non_hereditary_patronymic", ["PPL_COMORIEN"], []],
      ["Mze", "non_hereditary_patronymic", ["PPL_COMORIEN"], []],
    ],
  },
};
