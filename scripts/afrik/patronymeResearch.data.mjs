/**
 * Researched claims for the 30 `PAT_*` fiches, from the pass ETNI-1461 never ran.
 *
 * Tiering follows the Source Tier policy verbatim: nothing is excluded for being
 * weak, everything carries its tier. Published scholarship and an official state
 * source sit at `referenced`/`official`; community clan sites and surname
 * aggregators sit at `unverified` and are cited rather than dropped, because the
 * izithakazelo and ebika they publish are the emic record.
 *
 * Wikipedia is cited nowhere. Where a claim was reached through it, the primary
 * source is cited at its own tier and `notes` records the crossing so the chain
 * stays auditable and the verification still owed stays visible.
 */

export const SOURCES = {
  "niane-1960": {
    title: "Soundjata ou l'épopée mandingue",
    url: "https://books.google.com/books/about/Soundjata.html?id=PtJyAAAAMAAJ",
    tier: "referenced",
    source_kind: "academic",
    notes:
      "Niane, Djibril Tamsir, Présence Africaine, 1960. Transcription du récit du " +
      "griot Djeli Mamadou Kouyaté de Djeliba Koro (Siguiri). Source de référence " +
      "pour la geste de Soundiata et les lignages qu'elle fonde ; c'est une mise " +
      "par écrit d'une tradition orale, pas un document d'archive.",
  },
  "jansen-sunjata-paradigm": {
    title: "Beyond the Mali Empire — A New Paradigm for the Sunjata Epic",
    url: "https://scholarlypublications.universiteitleiden.nl/access/item:2952645/download",
    tier: "referenced",
    source_kind: "academic",
    notes:
      "Jansen, Jan, Universiteit Leiden. Travail critique sur la transmission de " +
      "l'épopée et sur le jamu comme institution sociale plutôt que comme mémoire " +
      "historique ; utilisé ici pour la nature du jamu, non pour dater un ancêtre.",
  },
  "jelis-multilingualism-2024": {
    title:
      "Language choices reflecting social changes: multilingualism in the popular music of Guinean jelis",
    url: "https://www.tandfonline.com/doi/full/10.1080/14790718.2024.2379547",
    tier: "referenced",
    source_kind: "academic",
    notes:
      "Journal of Multilingual and Multicultural Development, 2024. Établit que " +
      "les jeli se recrutent dans des clans identifiables (Kouyaté, Diabaté, Kanté, " +
      "Cissoko) et que la fonction est héréditaire.",
  },
  "segoublog-sanankuya": {
    title: "Sinankouya ou Sanankuya : cousinage, parenté à plaisanterie",
    url: "https://segoublog.wordpress.com/2019/12/27/piqure-de-rappel-sinankouya-ou-sanankuya-cousinage-parente-a-plaisanterie/",
    tier: "unverified",
    source_kind: "community",
    notes:
      "Blog malien. Cité pour les paires de sanankuya nommées (Traoré/Diarra, " +
      "Keïta/Coulibaly) ; le pacte est rapporté comme remontant à Soundiata, ce " +
      "que la source n'établit pas elle-même.",
  },
  "bolaaro-clans-peuls": {
    title: "Les clans peulhs du Fouta Djallon",
    url: "https://bolaaro.wordpress.com/2016/02/13/les-clans-peulhs-du-fouta-djallon/",
    tier: "unverified",
    source_kind: "community",
    notes:
      "Blog communautaire peul. Cité pour les quatre clans fondateurs (Diallo, Bâ, " +
      "Barry, Sow) ; aucune source académique n'a été trouvée pour cette " +
      "quadripartition lors de la passe.",
  },
  "roscoe-1911-baganda": {
    title: "The Baganda: An Account of their Native Customs and Beliefs",
    url: "https://archive.org/details/bagandaaccountof00roscuoft",
    tier: "referenced",
    source_kind: "academic",
    notes:
      "Roscoe, John, Macmillan, 1911, chapitre VI « The Clans and their Totems » " +
      "(p. 133-185). Ethnographie missionnaire coloniale, à lire comme telle ; " +
      "Apolo Kaggwa en fut le collecteur de traditions. Établit le système " +
      "totémique (totem principal + akabbiro, interdit alimentaire). " +
      "L'attribution du totem clan par clan a été atteinte via les articles de " +
      "clans de la Wikipédia anglophone : la vérification page à page dans le " +
      "chapitre VI reste due.",
  },
  "buganda-heritage-clans": {
    title: "Buganda Heritage and Information Centre — Clans",
    url: "https://www.bugandaheritage.org.uk/culture/clans",
    tier: "unverified",
    source_kind: "community",
    isSelfIdentification: true,
    notes:
      "Site patrimonial ganda. Auto-identification : donne les cinq clans " +
      "indigènes Banansangwa (Ffumbe, Lugave, Nggonge, Njaza, Nnyonyi), le " +
      "passage à 52 clans en 1966, et l'interdit alimentaire.",
  },
  "ibn-khaldun-ibar": {
    title:
      "Histoire des Berbères et des dynasties musulmanes de l'Afrique septentrionale (Kitāb al-ʿIbar)",
    url: "https://archive.org/details/histoiredesberbe01ibnk",
    tier: "referenced",
    // Chronique du XIVe siècle : source primaire, pas une étude moderne.
    source_kind: "archive",
    notes:
      "Ibn Khaldūn, XIVe siècle ; traduction de William MacGuckin de Slane, " +
      "Alger, Imprimerie du gouvernement, 1852. La notice sur les Zénètes et " +
      "leurs branches court sur les tomes I et III ; le lien pointe le tome I. " +
      "Traduction coloniale du XIXe siècle, à lire comme telle.",
  },
  "ethnonymie-berbere-ibar": {
    title:
      "Ibn Khaldûn, une source historique majeure : l'apport du Kitâb al-'Ibar à la connaissance de l'ethnonymie berbère",
    url: "https://www.researchgate.net/publication/382346129_Ibn_Khaldun_une_source_historique_majeure_l'apport_du_Kitab_al-'Ibar_a_la_connaissance_de_l'ethnonymie_berbere",
    tier: "referenced",
    source_kind: "academic",
    notes:
      "Analyse moderne de l'ethnonymie berbère chez Ibn Khaldûn : paradigme " +
      "onomastique Zana/Zanat/Iznaten/Zanata et branches principales (Jarawa, " +
      "Maghrawa, Banu Ifren).",
  },
  "cultural-atlas-ethiopian-naming": {
    title: "Ethiopian Culture — Naming",
    url: "https://culturalatlas.sbs.com.au/ethiopian-culture/ethiopian-culture-naming",
    tier: "referenced",
    // Ouvrage de référence sur une pratique de nomination, publié par une
    // institution — le seul créneau « ouvrage de référence » du vocabulaire.
    source_kind: "linguistic_reference",
    notes:
      "Cultural Atlas, publié par SBS (radiodiffuseur public australien). Établit " +
      "l'absence de nom de famille et la structure prénom + prénom du père, le " +
      "grand-père servant à désambiguïser.",
  },
  "familysearch-ethiopia-naming": {
    title: "Ethiopia Naming Customs",
    url: "https://www.familysearch.org/en/wiki/Ethiopia_Naming_Customs",
    tier: "unverified",
    source_kind: "community",
    notes:
      "Wiki généalogique de FamilySearch. Contributif : cité pour les éléments " +
      "guèzes Gäbrä (« serviteur de ») et Wäldä (« fils de »), à recouper sur un " +
      "dictionnaire de guèze.",
  },
  "un-eswatini-country-facts": {
    title: "eSwatini — Country Facts (UN Member States)",
    url: "https://www.un.int/eswatini/swaziland/country-facts",
    tier: "official",
    source_kind: "government",
    notes:
      "Mission permanente de l'Eswatini auprès des Nations unies. Source d'État " +
      "pour la scission des Nkosi Dlamini du courant nguni sous Ngwane et leur " +
      "installation sur la Pongolo.",
  },
  "nomina-africana-nguni-naming": {
    title:
      "Derivation of given names from ethnonyms, surnames and clan praises: unveiling gendered naming trends in Nguni",
    url: "https://journals.co.za/doi/10.10520/ejc-nomina_v39_n1_a3",
    tier: "referenced",
    source_kind: "academic",
    notes:
      "Nomina Africana: Journal of African Onomastics, vol. 39 n° 1. Établit " +
      "l'articulation entre patronyme (isibongo) et louanges de clan " +
      "(izithakazelo) chez les Nguni.",
  },
  "iafrika-izithakazelo-ndlovu": {
    title: "Izithakazelo zakwa Ndlovu — Clan Names",
    url: "https://iafrika.org/izithakazelo-zakwa-ndlovu-clan-names/",
    tier: "unverified",
    source_kind: "community",
    isSelfIdentification: true,
    notes:
      "Site communautaire de louanges de clan. Auto-identification : cité pour le " +
      "totem de l'éléphant et la filiation revendiquée par le clan Ndlovu.",
  },
  "iafrika-umlando-dlamini": {
    title: "Umlando wakwa Dlamini — Clan Names",
    url: "https://iafrika.org/umlando-wakwa-dlamini-clan-names/",
    tier: "unverified",
    source_kind: "community",
    isSelfIdentification: true,
    notes:
      "Site communautaire. Auto-identification : cité pour la remontée du clan à " +
      "Dlamini I, dit Matalatala.",
  },
  "ngonipeople-izithakazelo": {
    title: "Izithakazelo of Nguni clans",
    url: "https://www.ngonipeople.com/2010/11/izithakazelo-of-nguni-clans.html",
    tier: "unverified",
    source_kind: "community",
    isSelfIdentification: true,
    notes:
      "Site communautaire ngoni. Cité pour l'appartenance de Mthethwa, Nxumalo, " +
      "Ndlovu et Dlamini au corpus des izithakazelo nguni.",
  },
  "discoveryoruba-oriki": {
    title: "The Power of Oríkì: How Praise Names Shape Identity",
    url: "https://discoveryoruba.com/power-of-oriki-how-praise-names-shape-identity/",
    tier: "unverified",
    source_kind: "community",
    notes:
      "Site culturel yoruba. Cité pour la distinction entre oríkì personnel et " +
      "oríkì orílẹ̀ (louange de lignage, héritée), non pour un lignage particulier.",
  },
};

/** Shared across the twelve Mande fiches: the jamu is a patrilineal clan name. */
const MANDE_JAMU = {
  transmissionMode: "patrilineal",
  designatedSocialUnit: "clan",
};

const ORAL_MANDE = (claim, claimStatus = "claimed") => ({
  claim,
  claimStatus,
  griot: "Djeli Mamadou Kouyaté (Djeliba Koro, Siguiri)",
  transcription: "Niane, Djibril Tamsir, Soundjata ou l'épopée mandingue, 1960",
  sourceRefs: ["niane-1960"],
});

const JAMU_RECONSTRUCTION = {
  claim:
    "Le jamu est un nom de clan patrilinéaire : il désigne l'appartenance à un " +
    "groupe de descendance, et non une filiation individuelle au père.",
  claimStatus: "established",
  sourceRefs: ["jansen-sunjata-paradigm"],
};

const NGUNI_ISIBONGO = {
  transmissionMode: "patrilineal",
  designatedSocialUnit: "clan",
};

const NGUNI_RECONSTRUCTION = {
  claim:
    "Chez les Nguni, l'isibongo (patronyme) et les izithakazelo (louanges de " +
    "clan) sont deux objets distincts : le second dit l'ascendance et gouverne " +
    "l'exogamie, le premier sert d'identifiant d'état civil.",
  claimStatus: "established",
  sourceRefs: ["nomina-africana-nguni-naming"],
};

const NGUNI_ORIGIN_GAP =
  "Aucune tradition d'origine propre à ce clan n'a été trouvée lors de la " +
  "passe : seule l'articulation isibongo / izithakazelo est établie.";

const NGUNI_GAPS = {
  alliances:
    "Le système nguni n'a pas d'équivalent du sanankuya : les izithakazelo lient " +
    "un clan à ses ancêtres, pas deux clans entre eux.",
  casteOrSocialFunction:
    "Aucune fonction héréditaire attestée au niveau du clan.",
  bearers:
    "Aucun porteur décédé n'a pu être rattaché au clan par une source dédiée " +
    "lors de la passe.",
  homonyms:
    "Aucun homonyme distinct n'a été trouvé lors de la passe de recherche.",
};

export const RESEARCH = {
  // ===========================================================================
  // Manden — jamu
  // ===========================================================================
  PAT_TRAORE: {
    ...MANDE_JAMU,
    origin: {
      oralTraditions: [
        ORAL_MANDE(
          "Tiramaghan Traoré, général de Soundiata et conquérant du Kaabu, est " +
            "donné comme ancêtre éponyme du clan Tarawele dans la geste."
        ),
      ],
      writtenChronicles: [],
      linguisticReconstructions: [
        JAMU_RECONSTRUCTION,
        {
          claim:
            "La forme mandingue du nom est Tarawele ; Traoré en est la " +
            "transcription coloniale francophone. Aucune étymologie ne fait " +
            "consensus.",
          claimStatus: "contested",
          sourceRefs: ["jansen-sunjata-paradigm"],
        },
      ],
    },
    alliances: [
      {
        targetPatronymeId: "PAT_DIARRA",
        allianceType: "sanankuya",
        sourceRefs: ["segoublog-sanankuya"],
      },
    ],
    bearers: [
      {
        status: "deceased",
        displayName: "Tiramaghan Traoré",
        sourceRefs: ["niane-1960"],
      },
    ],
    sourceKeys: [
      "niane-1960",
      "jansen-sunjata-paradigm",
      "segoublog-sanankuya",
    ],
    gapReasons: {
      casteOrSocialFunction:
        "Aucune fonction héréditaire n'est attachée au jamu Tarawele : c'est un " +
        "clan de statut horon (noble), non un clan de spécialistes.",
      homonyms:
        "Aucun homonyme distinct n'a été trouvé lors de la passe de recherche.",
    },
  },

  PAT_DIARRA: {
    ...MANDE_JAMU,
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [JAMU_RECONSTRUCTION],
    },
    alliances: [
      {
        targetPatronymeId: "PAT_TRAORE",
        allianceType: "sanankuya",
        sourceRefs: ["segoublog-sanankuya"],
      },
    ],
    sourceKeys: ["jansen-sunjata-paradigm", "segoublog-sanankuya"],
    gapReasons: {
      origin:
        "L'étymologie courante rattachant Diarra à jara (« lion ») n'a été " +
        "trouvée que sur des agrégateurs de patronymes sans appareil critique ; " +
        "elle n'est pas reprise ici faute de source dédiée.",
      casteOrSocialFunction:
        "Aucune fonction héréditaire attestée : clan de statut horon.",
      bearers:
        "Aucun porteur décédé n'a pu être rattaché au clan par une source " +
        "distincte de l'homonymie de patronyme lors de la passe.",
      homonyms:
        "Aucun homonyme distinct n'a été trouvé lors de la passe de recherche.",
    },
  },

  PAT_KEITA: {
    ...MANDE_JAMU,
    origin: {
      oralTraditions: [
        ORAL_MANDE(
          "Le clan Keïta est celui de Soundiata et de la dynastie impériale du " +
            "Mali ; la geste lui donne le lion pour ancêtre-totem, d'où " +
            "l'épithète « fils du Lion »."
        ),
      ],
      writtenChronicles: [],
      linguisticReconstructions: [JAMU_RECONSTRUCTION],
    },
    alliances: [
      {
        targetPatronymeId: "PAT_COULIBALY",
        allianceType: "sanankuya",
        sourceRefs: ["segoublog-sanankuya"],
      },
    ],
    bearers: [
      {
        status: "deceased",
        displayName: "Soundiata Keïta",
        sourceRefs: ["niane-1960"],
      },
    ],
    sourceKeys: [
      "niane-1960",
      "jansen-sunjata-paradigm",
      "segoublog-sanankuya",
    ],
    gapReasons: {
      casteOrSocialFunction:
        "Clan royal de statut horon : la royauté n'est pas une fonction " +
        "héréditaire de caste au sens du champ.",
      homonyms:
        "Aucun homonyme distinct n'a été trouvé lors de la passe de recherche.",
    },
  },

  PAT_COULIBALY: {
    ...MANDE_JAMU,
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [JAMU_RECONSTRUCTION],
    },
    alliances: [
      {
        targetPatronymeId: "PAT_KEITA",
        allianceType: "sanankuya",
        sourceRefs: ["segoublog-sanankuya"],
      },
    ],
    sourceKeys: ["jansen-sunjata-paradigm", "segoublog-sanankuya"],
    gapReasons: {
      origin:
        "Aucune source dédiée n'a été trouvée pour l'origine du jamu Kulibali " +
        "lors de la passe ; le rattachement à la dynastie de Ségou relève de " +
        "l'histoire politique, pas de l'origine du nom.",
      casteOrSocialFunction:
        "Aucune fonction héréditaire attestée : clan de statut horon.",
      bearers:
        "Aucun porteur décédé n'a pu être rattaché au clan par une source dédiée " +
        "lors de la passe.",
      homonyms:
        "Aucun homonyme distinct n'a été trouvé lors de la passe de recherche.",
    },
  },

  PAT_KOUYATE: {
    ...MANDE_JAMU,
    origin: {
      oralTraditions: [
        ORAL_MANDE(
          "Les Kouyaté se disent descendants de Balla Fasséké Kouyaté, griot de " +
            "Soundiata, et jeli attitrés des princes Keïta du Manden depuis le " +
            "XIIIe siècle."
        ),
      ],
      writtenChronicles: [],
      linguisticReconstructions: [JAMU_RECONSTRUCTION],
    },
    casteOrSocialFunction: {
      value:
        "Jeli (griot) : fonction héréditaire de dépositaire de la parole, de " +
        "l'histoire et de la médiation, exercée par un groupe endogame distinct " +
        "des clans horon.",
      sourceRefs: ["jelis-multilingualism-2024"],
    },
    bearers: [
      {
        status: "deceased",
        displayName: "Balla Fasséké Kouyaté",
        sourceRefs: ["niane-1960"],
      },
      {
        status: "deceased",
        displayName: "Djeli Mamadou Kouyaté",
        sourceRefs: ["niane-1960"],
      },
    ],
    sourceKeys: [
      "niane-1960",
      "jansen-sunjata-paradigm",
      "jelis-multilingualism-2024",
    ],
    gapReasons: {
      alliances:
        "Aucune paire de sanankuya nommant les Kouyaté n'a été trouvée lors de " +
        "la passe ; la relation jeli/horon n'est pas un sanankuya.",
      homonyms:
        "Aucun homonyme distinct n'a été trouvé lors de la passe de recherche.",
    },
  },

  PAT_DIABATE: {
    ...MANDE_JAMU,
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [JAMU_RECONSTRUCTION],
    },
    casteOrSocialFunction: {
      value:
        "Jeli (griot) : les Diabaté comptent parmi les clans de jeli identifiés " +
        "comme tels dans le Manden, aux côtés des Kouyaté, Kanté et Cissoko.",
      sourceRefs: ["jelis-multilingualism-2024"],
    },
    sourceKeys: ["jansen-sunjata-paradigm", "jelis-multilingualism-2024"],
    gapReasons: {
      origin:
        "Aucune tradition d'origine propre aux Diabaté n'a été trouvée lors de " +
        "la passe, en dehors de leur statut de clan de jeli.",
      alliances:
        "Aucune paire de sanankuya nommant les Diabaté n'a été trouvée.",
      bearers:
        "Aucun porteur décédé n'a pu être rattaché au clan par une source dédiée " +
        "lors de la passe.",
      homonyms:
        "Aucun homonyme distinct n'a été trouvé lors de la passe de recherche.",
    },
  },

  PAT_CAMARA: { ...MANDE_JAMU, ...mandeThin() },
  PAT_FOFANA: { ...MANDE_JAMU, ...mandeThin() },
  PAT_DOUMBIA: { ...MANDE_JAMU, ...mandeThin() },

  PAT_BAMBA_CLAN: {
    ...MANDE_JAMU,
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [JAMU_RECONSTRUCTION],
    },
    homonyms: [
      {
        label: "Amadou Bamba (Cheikh Ahmadou Bamba Mbacké)",
        entityType: "person",
        entityId: null,
        distinction:
          "Bamba est ici un élément de nom personnel wolof porté par le fondateur " +
          "de la confrérie mouride, sans rapport de descendance avec le jamu " +
          "dioula Bamba : homonymie de graphie, pas de lignage.",
        sourceRefs: ["jansen-sunjata-paradigm"],
      },
    ],
    sourceKeys: ["jansen-sunjata-paradigm"],
    gapReasons: {
      origin:
        "Aucune tradition d'origine propre au jamu Bamba n'a été trouvée lors de " +
        "la passe.",
      alliances: "Aucune paire de sanankuya nommant les Bamba n'a été trouvée.",
      casteOrSocialFunction:
        "Aucune fonction héréditaire attestée au niveau du clan.",
      bearers:
        "Aucun porteur décédé n'a pu être rattaché au clan par une source dédiée " +
        "lors de la passe.",
    },
  },

  // Fulɓe — clans, not jamu: the four founding lineages of the Fouta.
  PAT_DIALLO: { ...fulbeClan(), sourceKeys: ["bolaaro-clans-peuls"] },
  PAT_SOW: { ...fulbeClan(), sourceKeys: ["bolaaro-clans-peuls"] },

  // ===========================================================================
  // Nguni — isibongo et izithakazelo
  // ===========================================================================
  PAT_DLAMINI_CLAN: {
    ...NGUNI_ISIBONGO,
    origin: {
      oralTraditions: [],
      writtenChronicles: [
        {
          claim:
            "Les Nkosi Dlamini se sont détachés du courant migratoire nguni " +
            "conduit par le chef Ngwane et se sont installés dans la région de la " +
            "Pongolo, absorbant les clans nguni et sotho présents.",
          claimStatus: "established",
          sourceRefs: ["un-eswatini-country-facts"],
        },
      ],
      linguisticReconstructions: [NGUNI_RECONSTRUCTION],
    },
    bearers: [
      {
        status: "deceased",
        displayName: "Sobhuza II",
        sourceRefs: ["un-eswatini-country-facts"],
      },
    ],
    sourceKeys: [
      "un-eswatini-country-facts",
      "nomina-africana-nguni-naming",
      "iafrika-umlando-dlamini",
      "ngonipeople-izithakazelo",
    ],
    gapReasons: {
      alliances:
        "Le système nguni n'a pas d'équivalent du sanankuya : les izithakazelo " +
        "lient un clan à ses ancêtres, pas deux clans entre eux.",
      casteOrSocialFunction:
        "Clan royal de l'Eswatini : la royauté n'est pas une fonction héréditaire " +
        "de caste au sens du champ.",
      homonyms:
        "Dlamini est porté dans les branches xhosa, zoulou, swazi et sotho du " +
        "groupe nguni ; faute de source établissant des origines distinctes, ces " +
        "branches ne sont pas traitées comme des homonymes.",
    },
  },

  PAT_NDLOVU: {
    ...NGUNI_ISIBONGO,
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [
        NGUNI_RECONSTRUCTION,
        {
          claim:
            "Ndlovu signifie « éléphant » en langues nguni ; le clan revendique " +
            "une descendance du troupeau d'éléphants du territoire où il s'est " +
            "établi.",
          claimStatus: "claimed",
          sourceRefs: ["iafrika-izithakazelo-ndlovu"],
        },
      ],
    },
    sourceKeys: [
      "nomina-africana-nguni-naming",
      "iafrika-izithakazelo-ndlovu",
      "ngonipeople-izithakazelo",
    ],
    gapReasons: NGUNI_GAPS,
  },

  PAT_MTHETHWA: {
    ...NGUNI_ISIBONGO,
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [NGUNI_RECONSTRUCTION],
    },
    sourceKeys: ["nomina-africana-nguni-naming", "ngonipeople-izithakazelo"],
    gapReasons: {
      ...NGUNI_GAPS,
      origin:
        "Le rattachement des Mthethwa au royaume mthethwa du KwaZulu-Natal n'a " +
        "été trouvé que sur des sites communautaires sans appareil critique ; il " +
        "relève de l'histoire politique et n'établit pas l'origine du nom.",
    },
  },

  PAT_NXUMALO: {
    ...NGUNI_ISIBONGO,
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [NGUNI_RECONSTRUCTION],
    },
    sourceKeys: ["nomina-africana-nguni-naming", "ngonipeople-izithakazelo"],
    gapReasons: { ...NGUNI_GAPS, origin: NGUNI_ORIGIN_GAP },
  },

  PAT_SIBANDA: {
    ...NGUNI_ISIBONGO,
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [NGUNI_RECONSTRUCTION],
    },
    sourceKeys: ["nomina-africana-nguni-naming"],
    gapReasons: { ...NGUNI_GAPS, origin: NGUNI_ORIGIN_GAP },
  },

  PAT_DUBE: {
    ...NGUNI_ISIBONGO,
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [NGUNI_RECONSTRUCTION],
    },
    sourceKeys: ["nomina-africana-nguni-naming"],
    gapReasons: { ...NGUNI_GAPS, origin: NGUNI_ORIGIN_GAP },
  },

  PAT_MNTUNGWA_PRAISE: {
    transmissionMode: "patrilineal",
    designatedSocialUnit: "lineage",
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [
        {
          claim:
            "Mntungwa relève des izithakazelo — les louanges de clan nguni, " +
            "distinctes de l'isibongo (patronyme) : elles nomment les figures " +
            "marquantes du lignage et se récitent en salutation.",
          claimStatus: "established",
          sourceRefs: ["nomina-africana-nguni-naming"],
        },
      ],
    },
    sourceKeys: ["nomina-africana-nguni-naming", "ngonipeople-izithakazelo"],
    gapReasons: { ...NGUNI_GAPS, origin: NGUNI_ORIGIN_GAP },
  },

  // ===========================================================================
  // Buganda — ebika totémiques
  // ===========================================================================
  PAT_FFUMBE: bugandaClan(
    "la civette d'Afrique",
    "Clan Banansangwa, l'un des cinq clans trouvés sur place à l'arrivée de Kintu."
  ),
  PAT_LUGAVE: bugandaClan(
    "le pangolin",
    "Clan Banansangwa, l'un des cinq clans trouvés sur place à l'arrivée de Kintu."
  ),
  PAT_NGONGE: bugandaClan(
    "la loutre",
    "Clan Banansangwa, l'un des cinq clans trouvés sur place à l'arrivée de Kintu."
  ),
  PAT_NJAZA: bugandaClan(
    "le redunca (antilope des roseaux)",
    "Clan Banansangwa, l'un des cinq clans trouvés sur place à l'arrivée de Kintu."
  ),

  // ===========================================================================
  // Habesha — patronyme non héréditaire
  // ===========================================================================
  PAT_HAILE_PATRONYMIC: habeshaName(
    "Haile procède du guèze ḫayl, « puissance, force » ; le nom est le prénom du " +
      "père porté en second élément, non un nom de famille."
  ),
  PAT_WOLDE_MARIAM_PATRONYMIC: habeshaName(
    "Wolde procède du guèze wäldä, « fils de » ; Wolde Mariam se lit « fils de " +
      "Marie », composé théophore formé sur un nom marial."
  ),
  PAT_GHEBREMICHAEL_PATRONYMIC: habeshaName(
    "Ghebre procède du guèze gäbrä, « serviteur de » ; Ghebremichael se lit " +
      "« serviteur de Michel », composé théophore formé sur l'archange."
  ),
  PAT_KEBREAB_PATRONYMIC: habeshaName(
    "Kebreab procède du guèze kəbrä ab, « gloire du père » ; le nom est porté " +
      "comme prénom et devient patronyme à la génération suivante."
  ),

  // ===========================================================================
  // Zénètes — nisba tribale
  // ===========================================================================
  PAT_MAGHRAWA: zenataNisba(
    "Ibn Khaldûn range les Maghrawa parmi les trois grandes branches zénètes, " +
      "avec les Jarawa et les Banu Ifran, et rattache leur lignage à Madghis, " +
      "dans l'ensemble botr."
  ),
  PAT_BANU_IFRAN: zenataNisba(
    "Ibn Khaldûn fait dériver le nom des Banu Ifran d'un ancêtre éponyme, Ifri, " +
      "dont le nom signifie « caverne » en langues berbères."
  ),

  // ===========================================================================
  // Yoruba — oríkì orílẹ̀
  // ===========================================================================
  PAT_ABIKAN_PRAISE: {
    transmissionMode: "patrilineal",
    designatedSocialUnit: "lineage",
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [
        {
          claim:
            "L'oríkì orílẹ̀ est la louange de lignage : distincte de l'oríkì " +
            "personnel, elle nomme les fondateurs et la localité d'origine et se " +
            "transmet, chaque enfant héritant du vers collectif de sa famille.",
          claimStatus: "established",
          sourceRefs: ["discoveryoruba-oriki"],
        },
      ],
    },
    sourceKeys: ["discoveryoruba-oriki"],
    gapReasons: {
      origin:
        "Aucune source documentant l'oríkì Abikan en particulier n'a été trouvée " +
        "lors de la passe : seule la nature de l'oríkì orílẹ̀ est établie.",
      alliances:
        "Le système yoruba ne documente pas d'alliance formelle entre oríkì de " +
        "lignages.",
      casteOrSocialFunction:
        "Aucune fonction héréditaire attestée pour ce lignage.",
      bearers:
        "Aucun porteur décédé n'a pu être rattaché au lignage par une source " +
        "dédiée lors de la passe.",
      homonyms:
        "Aucun homonyme distinct n'a été trouvé lors de la passe de recherche.",
    },
  },
};

function bugandaClan(totem, banansangwa) {
  return {
    transmissionMode: "patrilineal",
    designatedSocialUnit: "clan",
    origin: {
      oralTraditions: [],
      writtenChronicles: [
        {
          claim: `Le totem principal (omuziro) de ce clan est ${totem}. ${banansangwa}`,
          claimStatus: "claimed",
          sourceRefs: ["roscoe-1911-baganda", "buganda-heritage-clans"],
        },
      ],
      linguisticReconstructions: [
        {
          claim:
            "L'ekika ganda est un clan totémique : chaque clan porte un totem " +
            "principal (omuziro) et un totem secondaire (akabbiro), et le nom du " +
            "clan est celui du totem.",
          claimStatus: "established",
          sourceRefs: ["roscoe-1911-baganda"],
        },
      ],
    },
    totemicFoodProhibition: {
      value:
        "Il est tabou pour un Muganda de consommer son propre clan, qu'il " +
        "s'agisse de nourriture, de viande fraîche, de légume, de poisson ou de " +
        "fruit.",
      sourceRefs: ["buganda-heritage-clans", "roscoe-1911-baganda"],
    },
    sourceKeys: ["roscoe-1911-baganda", "buganda-heritage-clans"],
    gapReasons: {
      origin:
        "L'akabbiro (totem secondaire) et le titre du chef de clan n'ont pas été " +
        "vérifiés page à page dans le chapitre VI de Roscoe lors de la passe.",
      alliances:
        "Le système ganda ne documente pas d'alliance formelle entre ebika ; " +
        "l'exogamie clanique en est l'inverse.",
      casteOrSocialFunction:
        "Les charges héréditaires attachées aux clans ganda existent mais n'ont " +
        "pas été établies pour ce clan lors de la passe.",
      bearers:
        "Aucun porteur décédé n'a pu être rattaché au clan par une source dédiée " +
        "lors de la passe.",
      homonyms:
        "Aucun homonyme distinct n'a été trouvé lors de la passe de recherche.",
    },
  };
}

function habeshaName(etymology) {
  return {
    transmissionMode: "non_hereditary",
    designatedSocialUnit: "individual",
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [
        {
          claim: etymology,
          claimStatus: "claimed",
          sourceRefs: ["familysearch-ethiopia-naming"],
        },
        {
          claim:
            "Le système habesha ne comporte pas de nom de famille héréditaire : " +
            "le second élément est le nom personnel du père, celui du grand-père " +
            "servant à désambiguïser. Il change donc à chaque génération.",
          claimStatus: "established",
          sourceRefs: ["cultural-atlas-ethiopian-naming"],
        },
      ],
    },
    patronymicChainDepth: {
      generations: 3,
      sourceRefs: ["cultural-atlas-ethiopian-naming"],
    },
    sourceKeys: [
      "cultural-atlas-ethiopian-naming",
      "familysearch-ethiopia-naming",
    ],
    gapReasons: {
      alliances:
        "Un patronyme non héréditaire ne désigne pas de groupe : aucune alliance " +
        "entre noms n'est possible dans ce système.",
      casteOrSocialFunction:
        "Aucune fonction héréditaire ne peut s'attacher à un nom qui change à " +
        "chaque génération.",
      bearers:
        "Aucun porteur décédé n'a pu être rattaché au nom par une source dédiée " +
        "lors de la passe ; dans ce système, le partage d'un second élément " +
        "n'établit aucune parenté.",
      homonyms:
        "L'homonymie est la règle et non l'exception dans un système " +
        "patronymique non héréditaire : elle n'y est pas une donnée à recenser.",
    },
  };
}

function zenataNisba(chronicleClaim) {
  return {
    transmissionMode: "patrilineal",
    designatedSocialUnit: "lineage",
    nisbaSubtype: {
      value: "tribal",
      sourceRefs: ["ethnonymie-berbere-ibar"],
    },
    origin: {
      oralTraditions: [],
      writtenChronicles: [
        {
          claim: chronicleClaim,
          claimStatus: "claimed",
          sourceRefs: ["ibn-khaldun-ibar", "ethnonymie-berbere-ibar"],
        },
      ],
      linguisticReconstructions: [
        {
          claim:
            "Ibn Khaldûn expose le paradigme onomastique zénète à partir de " +
            "l'ancêtre éponyme Jana : Zana/Zanat, Iznaten, Zanata — la nisba " +
            "tribale y est construite sur le nom de l'ancêtre.",
          claimStatus: "established",
          sourceRefs: ["ethnonymie-berbere-ibar"],
        },
      ],
    },
    sourceKeys: ["ibn-khaldun-ibar", "ethnonymie-berbere-ibar"],
    gapReasons: {
      alliances:
        "Les alliances entre tribus zénètes relèvent de l'histoire politique et " +
        "n'ont pas été établies comme alliances entre noms lors de la passe.",
      casteOrSocialFunction:
        "Aucune fonction héréditaire attestée au niveau de la tribu.",
      bearers:
        "Aucun porteur décédé n'a pu être rattaché à la tribu par une source " +
        "dédiée lors de la passe.",
      homonyms:
        "Aucun homonyme distinct n'a été trouvé lors de la passe de recherche.",
    },
  };
}

function mandeThin() {
  return {
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [JAMU_RECONSTRUCTION],
    },
    sourceKeys: ["jansen-sunjata-paradigm"],
    gapReasons: {
      origin:
        "Aucune tradition d'origine propre à ce jamu n'a été trouvée lors de la " +
        "passe : seule la nature clanique et patrilinéaire du jamu est établie.",
      alliances: "Aucune paire de sanankuya nommant ce clan n'a été trouvée.",
      casteOrSocialFunction:
        "Aucune fonction héréditaire attestée au niveau du clan.",
      bearers:
        "Aucun porteur décédé n'a pu être rattaché au clan par une source dédiée " +
        "lors de la passe.",
      homonyms:
        "Aucun homonyme distinct n'a été trouvé lors de la passe de recherche.",
    },
  };
}

function fulbeClan() {
  return {
    transmissionMode: "patrilineal",
    designatedSocialUnit: "clan",
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [
        {
          claim:
            "Le nom relève des quatre clans par lesquels les Fulɓe se " +
            "reconnaissent — Diallo, Bâ, Barry et Sow — dont la quadripartition " +
            "structure l'identification clanique du Fouta.",
          claimStatus: "claimed",
          sourceRefs: ["bolaaro-clans-peuls"],
        },
      ],
    },
    gapReasons: {
      origin:
        "Aucune source académique n'a été trouvée pour l'origine de la " +
        "quadripartition clanique peule lors de la passe ; seule une source " +
        "communautaire l'atteste.",
      alliances:
        "Le dendiraagal (parenté à plaisanterie peule) est documenté comme " +
        "institution mais aucune paire nommant ce clan n'a été trouvée.",
      casteOrSocialFunction:
        "Aucune fonction héréditaire attestée au niveau du clan.",
      bearers:
        "Aucun porteur décédé n'a pu être rattaché au clan par une source dédiée " +
        "lors de la passe.",
      homonyms:
        "Aucun homonyme distinct n'a été trouvé lors de la passe de recherche.",
    },
  };
}
