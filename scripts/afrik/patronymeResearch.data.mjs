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
      "L'attribution du totem clan par clan avait été atteinte via les articles " +
      "de clans de la Wikipédia anglophone ; la vérification page à page était " +
      "due et a été faite sur le texte intégral, « List of the Clans with their " +
      "Totems », p. 138-139 : Ngonge (loutre) nº 4, Fumbe (civette) nº 6, Lugave " +
      "(Manis, pangolin) nº 11, Njaza nº 25. Roscoe glose Njaza par « Roebuck » " +
      "(chevreuil), là où l'usage actuel donne le redunca ; l'écart de glose est " +
      "conservé plutôt que corrigé en silence.",
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
  "leslau-1987-geez": {
    title:
      "Comparative Dictionary of Geʿez (Classical Ethiopic) — Geʿez-English / English-Geʿez, with an Index of the Semitic Roots",
    url: "https://archive.org/details/leslau-comparative-dictionary-of-geez-1987",
    tier: "official",
    source_kind: "academic",
    notes:
      "Leslau, Wolf, Otto Harrassowitz, Wiesbaden, 1987. Lexique de référence " +
      "du guèze. Les quatre éléments portés par les fiches habesha y ont été " +
      "vérifiés un à un dans le texte intégral : gabr « esclave, serviteur, " +
      "vassal » (le verbe gabra valant « faire, agir »), wald « fils » — l'état " +
      "construit walda wald donnant « petit-fils » —, hayl « puissance, force, " +
      "vaillance » et kabr « honneur, gloire, prestige ». Remplace ici un site " +
      "de généalogie qui portait seul ces étymologies.",
  },
  "afrik-pass-distinction-2026-09": {
    title:
      "Distinction posée par la passe de recherche anthroponymique AFRIK (septembre 2026)",
    url: null,
    tier: "unverified",
    source_kind: "ai_generated",
    notes:
      "Rapprochement établi par la passe elle-même, non repris d'une source " +
      "consultée. Étiqueté conformément à la doctrine des tiers : texte généré, " +
      "donc unverified x ai_generated, soit un poids de confiance de 0,2. Sert " +
      "aux seuls constats de non-recouvrement entre deux traditions de " +
      "nomination, jamais à porter une étymologie ni une généalogie. Une source " +
      "dédiée reste due sur chacun des points qu'il couvre.",
  },
  "charry-1996-jembe": {
    title: "A Guide to the Jembe",
    url: "https://echarry.web.wesleyan.edu/jembearticle/article.html",
    tier: "referenced",
    source_kind: "academic",
    notes:
      "Charry, Eric, Percussive Notes 34(2), avril 1996, p. 66-72 ; l'auteur est " +
      "l'ethnomusicologue de Mande Music (University of Chicago Press, 2000). " +
      "Article de revue spécialisée, non de revue à comité de lecture : il est " +
      "cité ici pour l'attribution des jamuw aux statuts sociaux mandingues " +
      "(numu, jeli, horon), qu'il énonce nommément clan par clan, et non pour " +
      "l'histoire du jembe.",
  },
  "tamari-1991-caste": {
    title: "The Development of Caste Systems in West Africa",
    url: "https://shs.hal.science/halshs-00690180v1",
    tier: "referenced",
    source_kind: "academic",
    notes:
      "Tamari, Tal, The Journal of African History 32(2), 1991, p. 221-250 ; " +
      "dépôt ouvert HAL-SHS. Établit que les groupes endogames d'artisans et de " +
      "musiciens se rencontrent chez plus de quinze peuples ouest-africains et " +
      "qu'ils sont attestés chez les Malinké au plus tard vers 1300. Utilisé " +
      "pour l'institution de la caste, jamais pour rattacher un clan nommé à " +
      "une caste : cette attribution-là vient d'une autre source.",
  },
  "gha-iv-mali": {
    title:
      "General History of Africa, IV: Africa from the Twelfth to the Sixteenth Century",
    url: "https://archive.org/details/unesco_general_history_africa_iv",
    tier: "official",
    source_kind: "intergovernmental",
    notes:
      "UNESCO, Histoire générale de l'Afrique, vol. IV, dir. D. T. Niane, 1984 ; " +
      "consulté sur le texte intégral de l'exemplaire numérisé, non sur un index. " +
      "Le chapitre 6, « Mali and the second Mandingo expansion » (D. T. Niane, " +
      "p. 117-171), donne lignage par lignage l'implantation des clans malinké : " +
      "les Kamara tenant Sibi et Tabon et les Traoré le Gangaran (p. 127), les " +
      "deux branches Camara conduites par Tabon-Wana et Kamadian Camara de Sibi " +
      "(p. 131), Tiramaghan Traoré fondateur du Gabu (p. 127 n. 28, p. 133), la " +
      "correspondance des noms de clan d'un peuple à l'autre — un Traoré est reçu " +
      "comme frère par les Diop en pays wolof et peut prendre leur nom (p. 134 " +
      "n. 43) —, les griots Diabaté de Keyla et la réfection septennale du " +
      "Kamablon de Kangaba (p. 127 n. 28), et le griot du mansa toujours choisi " +
      "dans le clan Kouyaté (p. 160). L'ouvrage est une synthèse savante, non une " +
      "chronique : les claims qu'il porte ici sont donc rangés hors " +
      "writtenChronicles.",
  },
  "gha-v-16-18": {
    title:
      "General History of Africa, V: Africa from the Sixteenth to the Eighteenth Century",
    url: "https://archive.org/details/unesco_general_history_africa_v",
    tier: "official",
    source_kind: "intergovernmental",
    notes:
      "UNESCO, Histoire générale de l'Afrique, vol. V, dir. B. A. Ogot, 1992 ; " +
      "consulté sur le texte intégral. Chapitre 12, « From the Niger to the " +
      "Volta » (M. Izard et J. Ki-Zerbo) : le sanankunya entre les Kulibali " +
      "(Kurubari) et les Keita ou les Ture, donné comme indice de relations " +
      "anciennes entre Bambara et Malinké (p. 330) ; l'étymologie kulu " +
      "« pirogue » + bali privatif, tirée de la traversée du fleuve sans pirogue, " +
      "assortie par la source elle-même de la mention qu'il en existe d'autres " +
      "(p. 330 n. 7) ; la généalogie de Mamari Kulibali dit Biton (1712-1755), " +
      "arrière-petit-fils de Baramangolo par Kaladian, Danfassari et Soma " +
      "(p. 330-333). Chapitre 13, « The states and cultures of the Upper Guinean " +
      "coast » (C. Wondji) : la migration des Kongo-Vai depuis le haut Niger " +
      "sous la conduite du clan Camara, vers Bopolou puis les rivières Mano et " +
      "Moa, et le déplacement corrélé des Kono et des Vai vers les côtes du " +
      "Liberia et de la Sierra Leone (p. 375-377).",
  },
  "bamadaba-jamuw": {
    title: "Bamadaba — dictionnaire des noms claniques (jamuw)",
    url: "http://cormand.huma-num.fr/dicos/jamuw.zip",
    tier: "referenced",
    source_kind: "linguistic_reference",
    notes:
      "Annexe onomastique du Bamadaba, dictionnaire électronique bambara-français " +
      "supplément du Corpus bambara de référence (Bailleul, Davydov, Erman, " +
      "Maslinsky, Méric, Vydrin, 2011-2020, CC BY-NC-SA) ; l'annexe des noms " +
      "claniques est signalée comme telle par Vydrin, « Vers une lexicographie " +
      "mandingue sur la base de grands corpus annotés », Mandenkan 63, 2020, " +
      "p. 89-110. 375 entrées au format MDF, consultées sur le fichier complet. " +
      "Le fichier ne livre aucune légende de ses marqueurs, et la lecture " +
      "retenue est celle que le fichier impose : \\ca porte les termes de statut " +
      "mandingues eux-mêmes (nùmu, jèli, hɔ́rɔn, garanke, finɛ, tontigi, wage, " +
      "gesere) ; \\sn se lit senankun parce que l'entrée Kúyate annote sa propre " +
      "ligne « \\sn Keyita » d'une réserve disant que cette relation-là est une " +
      "entente amicale et non un senankuya. Les liens \\sn ne sont pas " +
      "systématiquement réciproques d'une entrée à l'autre : chaque paire est " +
      "donc citée d'après l'entrée qui la porte, nommée dans le claim ou le gap.",
  },
  "nichols-2020-diabate-review": {
    title:
      "Review of Massa Makan Diabaté, The Lieutenant of Kouta (trans. Auerbach & Yost)",
    url: "https://www.cambridge.org/core/journals/african-studies-review/article/massa-makan-diabate-the-lieutenant-of-kouta-translated-from-french-by-shane-auerbach-and-david-yost-east-lansing-michigan-state-university-press-2017-xi-113-pp-introduction-2000-paper-isbn-9781611862270/01AF0FE3900BD82768691B37BA6E998C",
    tier: "referenced",
    source_kind: "academic",
    notes:
      "Nichols, Eliza, African Studies Review 63(2), Cambridge University Press, " +
      "2020. Donne les dates de Massa Makan Diabaté (1938-1988), son ascendance " +
      "de griots et le fait qu'il fut le seul écrivain de sa génération à " +
      "conserver le patronyme qui le rattache à la caste des généalogistes — " +
      "soit une source portant sur le nom lui-même, et non sur la seule " +
      "homonymie de patronyme.",
  },
  "bryant-1929-olden-times": {
    title:
      "Olden Times in Zululand and Natal — Containing Earlier Political History of the Eastern-Nguni Clans",
    url: "https://archive.org/details/bwb_KT-091-892",
    tier: "referenced",
    source_kind: "academic",
    notes:
      "Bryant, Alfred T., Longmans Green, 1929. Ethnographie missionnaire " +
      "coloniale, à lire comme telle : Bryant écrit depuis la mission catholique " +
      "du Natal et sa chronologie clanique est reconstruite à partir de " +
      "généalogies orales recueillies au tournant du siècle. C'est néanmoins la " +
      "seule source imprimée qui donne, clan par clan, une origine nommée pour " +
      "les clans nguni orientaux. Consulté sur le texte intégral, pas sur un " +
      "index. Son orthographe est celle de 1929 (Mtetwa, Ntungwa) ; les fiches " +
      "conservent la graphie du corpus et citent la sienne comme variante.",
  },
  "zwane-2020-zulu-clan-names": {
    title: "The Morphological Analysis of Zulu Clan Names",
    url: "https://doi.org/10.5430/elr.v9n3p36",
    tier: "referenced",
    source_kind: "academic",
    notes:
      "Zwane, Celani Lucky, Department of African Languages, University of South " +
      "Africa ; English Linguistics Research 9(3), Sciedu Press, 2020. Analyse " +
      "morphémique des isibongo à partir de 50 entretiens dans le Kwahlathi " +
      "Tribal Authority (Ladysmith, KwaZulu-Natal). Réserve : l'article glose " +
      "Khumalo deux fois de façon divergente (§ 6.5.1 « mâcher ceci à sec », " +
      "§ 6.7.1 « manger ceci cru ») ; ses gloses par nom sont donc citées comme " +
      "revendiquées, non comme établies.",
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

/**
 * The caste institution, not the attribution of any one clan to it. Tamari
 * dates and situates the system; which jamu belongs to which status is a
 * separate claim carrying a separate source, because a shared statement about
 * nyamakalaw is exactly the kind of passage that ends up standing in for an
 * etymology it never made.
 */
const NYAMAKALA_RECONSTRUCTION = {
  claim:
    "Les nyamakalaw — groupes endogames d'artisans et de musiciens — sont " +
    "attestés chez les Malinké au plus tard vers 1300 et se retrouvent chez plus " +
    "de quinze peuples ouest-africains. Le statut se transmet avec le jamu, ce " +
    "qui fait du nom de clan le support de la position sociale autant que de la " +
    "descendance.",
  claimStatus: "established",
  sourceRefs: ["tamari-1991-caste"],
};

const NUMU_FUNCTION = {
  value:
    "Lignage de forgerons (numu), l'une des castes nyamakalaw ; le jamu est " +
    "nommément rangé parmi les lignages numu, aux côtés de Kanté.",
  sourceRefs: ["charry-1996-jembe", "tamari-1991-caste"],
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

/**
 * The one gap reason the Nguni fiches genuinely share: it states a property of
 * the naming system, not a failed lookup, so it is the same sentence for every
 * clan. Every other gap is a per-fiche search result and is written per fiche.
 */
const NGUNI_GAPS = {
  alliances:
    "Le système nguni n'a pas d'équivalent du sanankuya : les izithakazelo lient " +
    "un clan à ses ancêtres, pas deux clans entre eux.",
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
        sourceRefs: ["segoublog-sanankuya", "bamadaba-jamuw"],
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
      "bamadaba-jamuw",
    ],
    gapReasons: {
      casteOrSocialFunction:
        "Charry range nommément Traoré parmi les jamuw horon, de statut noble " +
        "et non artisan : aucune fonction héréditaire n'est attachée au jamu " +
        "Tarawele, et cette absence est établie plutôt que constatée faute de " +
        "recherche.",
      homonyms:
        "Traoré et Tarawele sont deux graphies d'un même jamu, la première " +
        "issue de la transcription coloniale : ce ne sont pas des lignées " +
        "distinctes et elles ne sont donc pas traitées en homonymes.",
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
        sourceRefs: ["segoublog-sanankuya", "bamadaba-jamuw"],
      },
      {
        // Porté par l'entrée Jàra, qui liste Dunbuya parmi ses senankun.
        targetPatronymeId: "PAT_DOUMBIA",
        allianceType: "sanankuya",
        sourceRefs: ["bamadaba-jamuw"],
      },
      {
        // Porté par l'entrée Jɛbatɛ, qui liste Jara ; l'entrée Jàra ne rend
        // pas le lien, les marqueurs \sn n'étant pas réciproques.
        targetPatronymeId: "PAT_DIABATE",
        allianceType: "sanankuya",
        sourceRefs: ["bamadaba-jamuw"],
      },
    ],
    sourceKeys: [
      "jansen-sunjata-paradigm",
      "segoublog-sanankuya",
      "bamadaba-jamuw",
    ],
    gapReasons: {
      origin:
        "L'étymologie courante rattachant Diarra à jara (« lion ») n'a été " +
        "trouvée que sur des agrégateurs de patronymes sans appareil critique ; " +
        "elle n'est pas reprise ici faute de source dédiée.",
      casteOrSocialFunction:
        "Le jamu ne figure ni parmi les lignages numu ni parmi les lignages " +
        "jeli que Charry énumère ; il ne figure pas non plus dans la courte " +
        "liste de jamuw horon qu'il donne (Keita, Konaté, Koné, Traoré). Le " +
        "statut horon que lui prêtent les répertoires courants n'a donc pas été " +
        "retrouvé dans une source dédiée, et n'est pas affirmé ici.",
      bearers:
        "Aucun porteur décédé n'a pu être rattaché au clan par une source " +
        "distincte de l'homonymie de patronyme lors de la passe : les Diarra " +
        "de la dynastie de Ségou relèvent de l'histoire politique et ne " +
        "documentent pas le nom.",
      homonyms:
        "Diarra et Jara sont deux graphies d'un même jamu. Aucune lignée " +
        "d'origine distincte n'a été trouvée, mais l'étymologie du nom restant " +
        "elle-même ouverte, une homonymie ne pourrait pas être écartée sur " +
        "cette base.",
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
        sourceRefs: ["gha-v-16-18", "bamadaba-jamuw", "segoublog-sanankuya"],
      },
      {
        // Porté par l'entrée Fófana, qui liste Keyita parmi ses senankun.
        targetPatronymeId: "PAT_FOFANA",
        allianceType: "sanankuya",
        sourceRefs: ["bamadaba-jamuw"],
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
      "gha-v-16-18",
      "bamadaba-jamuw",
    ],
    gapReasons: {
      casteOrSocialFunction:
        "Charry range nommément Keita parmi les jamuw horon, c'est-à-dire les " +
        "noms de statut noble et non artisan. L'absence de fonction héréditaire " +
        "est donc ici un résultat établi et non une recherche infructueuse : la " +
        "royauté n'est pas une caste au sens de ce champ.",
      homonyms:
        "Aucune lignée homonyme d'origine distincte n'a été trouvée. Le jamu " +
        "est porté bien au-delà de la descendance dynastique, par affiliation " +
        "et par adoption, mais c'est là une extension du même nom et non une " +
        "seconde origine.",
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
        sourceRefs: ["gha-v-16-18", "bamadaba-jamuw", "segoublog-sanankuya"],
      },
      {
        // Porté par l'entrée Fófana, qui liste Kulibali parmi ses senankun.
        targetPatronymeId: "PAT_FOFANA",
        allianceType: "sanankuya",
        sourceRefs: ["bamadaba-jamuw"],
      },
    ],
    sourceKeys: [
      "jansen-sunjata-paradigm",
      "segoublog-sanankuya",
      "gha-v-16-18",
      "bamadaba-jamuw",
    ],
    gapReasons: {
      origin:
        "Aucune source dédiée n'a été trouvée pour l'origine du jamu Kulibali " +
        "lors de la passe ; le rattachement à la dynastie de Ségou relève de " +
        "l'histoire politique, pas de l'origine du nom.",
      casteOrSocialFunction:
        "Le jamu ne figure ni parmi les lignages numu ni parmi les lignages " +
        "jeli que Charry énumère ; il ne figure pas non plus dans la courte " +
        "liste de jamuw horon qu'il donne (Keita, Konaté, Koné, Traoré). Le " +
        "statut horon que lui prêtent les répertoires courants n'a donc pas été " +
        "retrouvé dans une source dédiée, et n'est pas affirmé ici.",
      bearers:
        "Biton Coulibaly, fondateur du royaume bambara de Ségou, est amplement " +
        "documenté, mais comme figure politique : aucune source consultée ne " +
        "s'appuie sur lui pour établir l'origine du jamu, et la fiche ne " +
        "l'enregistre donc pas en porteur.",
      homonyms:
        "Coulibaly transcrit le mandingue Kulibali ; aucune lignée d'origine " +
        "distincte n'a été trouvée sous l'une ou l'autre graphie.",
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
      linguisticReconstructions: [
        JAMU_RECONSTRUCTION,
        NYAMAKALA_RECONSTRUCTION,
      ],
    },
    casteOrSocialFunction: {
      value:
        "Jeli (griot) : fonction héréditaire de dépositaire de la parole, de " +
        "l'histoire et de la médiation, exercée par un groupe endogame distinct " +
        "des clans horon. Kouyaté est l'un des deux jamuw que Charry donne comme " +
        "signalant par eux-mêmes l'appartenance jeli.",
      sourceRefs: [
        "jelis-multilingualism-2024",
        "charry-1996-jembe",
        "tamari-1991-caste",
      ],
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
      "charry-1996-jembe",
      "tamari-1991-caste",
    ],
    gapReasons: {
      alliances:
        "Le dictionnaire des jamuw range Keyita, Konate et Nakalu parmi les " +
        "senankun de Kúyate, mais annote la première de ces trois lignes d'une " +
        "réserve : la relation aux Keïta y est donnée pour une entente amicale " +
        "et non pour un senankuya. Konate et Nakalu n'ont pas de fiche dans le " +
        "lot, et le schéma n'enregistre une paire que si les deux patronymes " +
        "en ont une. Aucune paire n'est donc inscriptible ici — ce qui est un " +
        "résultat, non une recherche restée sans réponse. La relation jeli/horon " +
        "n'est pas davantage un sanankuya.",
      homonyms:
        "Aucune lignée homonyme d'origine distincte n'a été trouvée : les " +
        "Kouyaté relevés par les sources consultées se rattachent tous au même " +
        "lignage de jeli.",
    },
  },

  PAT_DIABATE: {
    ...MANDE_JAMU,
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [
        JAMU_RECONSTRUCTION,
        NYAMAKALA_RECONSTRUCTION,
      ],
    },
    casteOrSocialFunction: {
      value:
        "Jeli (griot) : les Diabaté comptent parmi les clans de jeli identifiés " +
        "comme tels dans le Manden, aux côtés des Kouyaté, Kanté et Cissoko. " +
        "Charry retient Diabaté et Kouyaté comme les deux jamuw qui signalent " +
        "par eux-mêmes l'appartenance jeli.",
      sourceRefs: [
        "jelis-multilingualism-2024",
        "charry-1996-jembe",
        "tamari-1991-caste",
      ],
    },
    alliances: [
      {
        // Porté par l'entrée Jɛbatɛ, qui liste Jara parmi ses senankun.
        targetPatronymeId: "PAT_DIARRA",
        allianceType: "sanankuya",
        sourceRefs: ["bamadaba-jamuw"],
      },
    ],
    sourceKeys: [
      "jansen-sunjata-paradigm",
      "jelis-multilingualism-2024",
      "charry-1996-jembe",
      "tamari-1991-caste",
      "bamadaba-jamuw",
    ],
    gapReasons: {
      origin:
        "Aucune tradition d'origine propre aux Diabaté n'a été trouvée lors de " +
        "la passe, en dehors de leur statut de clan de jeli. La geste de " +
        "Soundiata les nomme sans raconter l'origine du jamu.",
      bearers:
        "Aucun porteur décédé n'a pu être rattaché au clan par une source " +
        "distincte de l'homonymie de patronyme lors de la passe : les Diabaté " +
        "documentés le sont comme musiciens contemporains, que la règle des " +
        "porteurs écarte.",
      homonyms:
        "Aucune lignée homonyme d'origine distincte n'a été trouvée ; la " +
        "graphie Diabaté transcrit le mandingue Jabate.",
    },
  },

  PAT_CAMARA: {
    ...MANDE_JAMU,
    ...mandeThin(),
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [
        JAMU_RECONSTRUCTION,
        NYAMAKALA_RECONSTRUCTION,
      ],
    },
    casteOrSocialFunction: NUMU_FUNCTION,
    alliances: [
      {
        // La seule paire du bloc mandé que les deux entrées se rendent l'une à
        // l'autre : Kàmara liste Fofana, Fófana liste Kamara.
        targetPatronymeId: "PAT_FOFANA",
        allianceType: "sanankuya",
        sourceRefs: ["bamadaba-jamuw"],
      },
    ],
    sourceKeys: [
      "jansen-sunjata-paradigm",
      "charry-1996-jembe",
      "tamari-1991-caste",
      "bamadaba-jamuw",
    ],
    gapReasons: {
      origin:
        "Aucune tradition d'origine propre au jamu Kamara n'a été trouvée lors " +
        "de la passe. La geste de Soundiata nomme les Kamara parmi les lignages " +
        "de forgerons sans raconter l'origine du nom lui-même.",
      bearers:
        "Aucun porteur décédé n'a pu être rattaché au clan par une source " +
        "distincte de l'homonymie de patronyme lors de la passe.",
      homonyms:
        "La graphie Camara est la transcription francophone de Kamara ; ce sont " +
        "deux orthographes d'un même nom, non deux lignées, et elles ne sont " +
        "donc pas traitées en homonymes.",
    },
  },
  PAT_FOFANA: {
    ...MANDE_JAMU,
    ...mandeThin(),
    // L'entrée Fófana est la plus riche du bloc en senankun : elle en nomme
    // cinq, dont trois ont une fiche dans le lot.
    alliances: [
      {
        targetPatronymeId: "PAT_CAMARA",
        allianceType: "sanankuya",
        sourceRefs: ["bamadaba-jamuw"],
      },
      {
        targetPatronymeId: "PAT_KEITA",
        allianceType: "sanankuya",
        sourceRefs: ["bamadaba-jamuw"],
      },
      {
        targetPatronymeId: "PAT_COULIBALY",
        allianceType: "sanankuya",
        sourceRefs: ["bamadaba-jamuw"],
      },
    ],
    sourceKeys: ["jansen-sunjata-paradigm", "bamadaba-jamuw"],
    gapReasons: {
      origin:
        "Aucune tradition d'origine propre au jamu Fofana n'a été trouvée lors " +
        "de la passe : seule la nature clanique et patrilinéaire du jamu est " +
        "établie.",
      casteOrSocialFunction:
        "Fofana ne figure ni dans les lignages numu ni dans les lignages jeli " +
        "que Charry énumère, ni parmi les jamuw horon qu'il nomme : le nom n'a " +
        "été rattaché à aucun statut par les sources consultées, ce qui laisse " +
        "la question ouverte plutôt que tranchée par la négative.",
      bearers:
        "Aucun porteur décédé n'a pu être rattaché au clan par une source " +
        "distincte de l'homonymie de patronyme lors de la passe.",
      homonyms:
        "Fofana est porté dans les aires mandingue et soninké sans qu'une " +
        "source dédiée établisse deux origines distinctes.",
    },
  },
  PAT_DOUMBIA: {
    ...MANDE_JAMU,
    ...mandeThin(),
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [
        JAMU_RECONSTRUCTION,
        NYAMAKALA_RECONSTRUCTION,
      ],
    },
    casteOrSocialFunction: NUMU_FUNCTION,
    alliances: [
      {
        // Porté par l'entrée Jàra, qui liste Dunbuya — variante de Dunbiya —
        // parmi ses senankun ; l'entrée Dunbiya ne rend pas le lien.
        targetPatronymeId: "PAT_DIARRA",
        allianceType: "sanankuya",
        sourceRefs: ["bamadaba-jamuw"],
      },
    ],
    sourceKeys: [
      "jansen-sunjata-paradigm",
      "charry-1996-jembe",
      "tamari-1991-caste",
      "bamadaba-jamuw",
    ],
    gapReasons: {
      origin:
        "Aucune tradition d'origine propre au jamu Doumbia n'a été trouvée lors " +
        "de la passe. La geste de Soundiata nomme les Doumbia parmi les lignages " +
        "de forgerons sans raconter l'origine du nom lui-même.",
      bearers:
        "Aucun porteur décédé n'a pu être rattaché au clan par une source " +
        "distincte de l'homonymie de patronyme lors de la passe.",
      homonyms:
        "Aucune lignée homonyme d'origine distincte n'a été trouvée lors de la " +
        "passe.",
    },
  },

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
        sourceRefs: ["afrik-pass-distinction-2026-09"],
      },
    ],
    sourceKeys: ["jansen-sunjata-paradigm", "afrik-pass-distinction-2026-09"],
    gapReasons: {
      origin:
        "Aucune tradition d'origine propre au jamu Bamba n'a été trouvée lors de " +
        "la passe.",
      alliances:
        "Le dictionnaire des jamuw donne à l'entrée Bánbà trois senankun : " +
        "Kane, les Peuls et les Songhaï. Les deux derniers sont des peuples et " +
        "non des patronymes ; Kane n'a pas de fiche dans le lot, et le schéma " +
        "n'enregistre une paire que si les deux patronymes en ont une. La " +
        "recherche a donc trouvé des senankun sans qu'aucun soit inscriptible.",
      casteOrSocialFunction:
        "Bamba ne figure dans aucune des listes de lignages numu, jeli ou horon " +
        "que Charry énumère : le nom n'a été rattaché à aucun statut par les " +
        "sources consultées.",
      bearers:
        "Aucun porteur décédé n'a pu être rattaché au clan par une source " +
        "dédiée. Le porteur le mieux documenté du nom, Cheikh Ahmadou Bamba " +
        "Mbacké, relève précisément de l'homonymie signalée plus haut et non de " +
        "ce jamu.",
    },
  },

  // Fulɓe — clans, not jamu: the four founding lineages of the Fouta.
  PAT_DIALLO: {
    ...fulbeClan(
      "Les répertoires onomastiques consultés laissent l'étymologie de Diallo " +
        "inexpliquée : aucune racine pulaar établie ne la porte. Les " +
        "rattachements proposés — à un jallo qui vaudrait « commandement », ou " +
        "au mandingue diala pour la noblesse — ne sont corroborés par aucune " +
        "source linguistique primaire et ressemblent à des étymologies " +
        "populaires nées du contact peul-mandingue. L'absence d'étymologie " +
        "établie est ici le résultat de la recherche, non son défaut. Les " +
        "transcriptions Jalloh, Jallow et Djaló désignent le même nom et ne " +
        "sont donc pas des homonymes.",
      "Les Diallo comptent parmi les familles fondatrices de l'État " +
        "théocratique du Fouta-Djalon au XVIIIe siècle, mais aucune source " +
        "dédiée n'a permis de rattacher une personne décédée nommément au clan " +
        "plutôt qu'au seul patronyme."
    ),
    sourceKeys: ["bolaaro-clans-peuls"],
  },
  PAT_SOW: {
    ...fulbeClan(
      "Sow est porté à la fois dans l'aire peule et, par contact, dans l'aire " +
        "wolof du Sénégal, sans qu'une source dédiée établisse deux origines " +
        "distinctes : la répartition géographique ne suffit pas à faire un " +
        "homonyme, et les deux usages ne sont donc pas séparés.",
      "Aucun porteur décédé n'a pu être rattaché au clan par une source " +
        "distincte de la simple homonymie de patronyme lors de la passe."
    ),
    sourceKeys: ["bolaaro-clans-peuls"],
  },

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
      linguisticReconstructions: [
        NGUNI_RECONSTRUCTION,
        {
          claim:
            "Analysé morphémiquement, Dlamini se décompose en un verbe et un " +
            "adjectif : dla, « manger », et emini, « à midi », soudés par " +
            "élision de la voyelle initiale, d'où la lecture « manger à midi ». " +
            "Le nom de clan est ici formé sur une pratique observée, comme " +
            "nombre d'isibongo zoulou construits sur verbe et adjectif.",
          claimStatus: "claimed",
          sourceRefs: ["zwane-2020-zulu-clan-names"],
        },
      ],
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
      "zwane-2020-zulu-clan-names",
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
      writtenChronicles: [
        {
          claim:
            "Le sous-clan aba-kwa-Ndlovu a pour fondateur éponyme un homme " +
            "personnellement nommé Ndlovu, un Mpungose fils de Kuba, qui quitta " +
            "les environs de Ntlazatshe pour s'établir à la colline eThaleni, en " +
            "territoire emaCunwini, vraisemblablement sous le règne de Shaka.",
          claimStatus: "claimed",
          sourceRefs: ["bryant-1929-olden-times"],
        },
      ],
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
        {
          claim:
            "Le sens lexical « éléphant » est celui du nom de personne porté par " +
            "l'ancêtre ; il ne suit pas de là que le clan soit nommé d'après un " +
            "totem. La chronique clanique donne un éponyme, non un animal " +
            "tutélaire, et les deux explications ne se recouvrent pas.",
          claimStatus: "contested",
          sourceRefs: [
            "bryant-1929-olden-times",
            "iafrika-izithakazelo-ndlovu",
          ],
        },
      ],
    },
    homonyms: [
      {
        label: "aba-kwa-Ndlovu de la Ntsuze",
        entityType: "patronyme",
        entityId: null,
        distinction:
          "Bryant décrit un second clan aba-kwa-Ndlovu, établi sur la rive " +
          "gauche de la Ntsuze face aux Kanyile et donné pour apparenté aux " +
          "amaCunu. Il est distinct du sous-clan fondé par Ndlovu fils de Kuba : " +
          "même isibongo, deux origines, qui ne sont pas fusionnées ici.",
        sourceRefs: ["bryant-1929-olden-times"],
      },
    ],
    sourceKeys: [
      "nomina-africana-nguni-naming",
      "iafrika-izithakazelo-ndlovu",
      "ngonipeople-izithakazelo",
      "bryant-1929-olden-times",
    ],
    gapReasons: {
      alliances: NGUNI_GAPS.alliances,
      casteOrSocialFunction:
        "Aucune fonction héréditaire attestée au niveau du clan ; Bryant décrit " +
        "les Ndlovu comme un sous-clan territorial, non comme un corps de " +
        "spécialistes.",
      bearers:
        "L'ancêtre éponyme Ndlovu fils de Kuba est nommé par Bryant mais sans " +
        "dates ni éléments biographiques ; il est retenu comme origine du nom, " +
        "pas comme porteur documenté.",
    },
  },

  PAT_MTHETHWA: {
    ...NGUNI_ISIBONGO,
    origin: {
      oralTraditions: [],
      writtenChronicles: [
        {
          claim:
            "Le clan aba-kwa-Mtetwa, « ceux de Mtetwa », occupait vers 1808 la " +
            "bande côtière comprise entre la rivière Ntseleni et le lagon de " +
            "Sainte-Lucie et s'étendait sur une trentaine de kilomètres vers " +
            "l'intérieur. Il n'était pas le plus nombreux des clans du nord " +
            "nguni : c'est l'ascendant de son souverain Dingiswayo qui lui donna " +
            "la prééminence.",
          claimStatus: "established",
          sourceRefs: ["bryant-1929-olden-times"],
        },
      ],
      linguisticReconstructions: [NGUNI_RECONSTRUCTION],
    },
    sourceKeys: [
      "nomina-africana-nguni-naming",
      "ngonipeople-izithakazelo",
      "bryant-1929-olden-times",
    ],
    gapReasons: {
      alliances: NGUNI_GAPS.alliances,
      casteOrSocialFunction:
        "La prééminence des Mthethwa sous Dingiswayo est une hégémonie " +
        "politique, non une fonction héréditaire de caste au sens du champ.",
      bearers:
        "Dingiswayo est amplement documenté par Bryant, mais comme souverain " +
        "mthethwa et non comme attestation de l'origine du nom ; la fiche ne " +
        "l'enregistre pas en porteur pour ne pas faire d'une biographie royale " +
        "la source d'une étymologie.",
      homonyms:
        "Aucune lignée homonyme d'origine distincte n'a été trouvée dans le " +
        "texte intégral de Bryant, qui suit pourtant le clan sur seize passages.",
    },
  },

  PAT_NXUMALO: {
    ...NGUNI_ISIBONGO,
    origin: {
      oralTraditions: [],
      writtenChronicles: [
        {
          claim:
            "Les Nxumalo forment une section du clan ndwandwe. Le nom de clan " +
            "aba-kwa-Nxumalo, « ceux de Nxumalo », fut créé pour dénouer une " +
            "infraction à l'exogamie : le chef épousa une femme de son propre " +
            "clan, union prohibée, et la famille de l'épouse reçut un nom de " +
            "clan neuf afin que le mariage cessât d'être incestueux. Le nom " +
            "procède ici d'un acte de droit matrimonial, non d'un ancêtre ni " +
            "d'un totem.",
          claimStatus: "established",
          sourceRefs: ["bryant-1929-olden-times"],
        },
      ],
      linguisticReconstructions: [
        NGUNI_RECONSTRUCTION,
        {
          claim:
            "L'explication courante rattache Nxumalo à l'umNxuma, entonnoir de " +
            "cuir par lequel on faisait téter un nourrisson, Manukuza ayant " +
            "perdu sa mère en bas âge. Bryant rapporte cette explication comme " +
            "celle qu'on donne d'ordinaire et la juge peu convaincante, sans en " +
            "proposer d'autre : l'étymologie du nom reste ouverte.",
          claimStatus: "contested",
          sourceRefs: ["bryant-1929-olden-times"],
        },
      ],
    },
    sourceKeys: [
      "nomina-africana-nguni-naming",
      "ngonipeople-izithakazelo",
      "bryant-1929-olden-times",
    ],
    gapReasons: {
      alliances: NGUNI_GAPS.alliances,
      casteOrSocialFunction:
        "Aucune fonction héréditaire attestée : les Nxumalo sont une section " +
        "d'un clan royal, statut politique et non charge de spécialistes.",
      bearers:
        "Bryant nomme plusieurs Nxumalo (Mkatshwa, Malusi, Sotondose) mais la " +
        "généalogie ndwandwe est, de son propre aveu, si contradictoire que la " +
        "certitude n'est plus atteignable dans ses états anciens ; aucun porteur " +
        "n'est donc enregistré sur cette base.",
      homonyms:
        "Aucune lignée homonyme d'origine distincte n'a été trouvée : les " +
        "occurrences relevées chez Bryant renvoient toutes à la section " +
        "ndwandwe.",
    },
  },

  PAT_SIBANDA: {
    ...NGUNI_ISIBONGO,
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [NGUNI_RECONSTRUCTION],
    },
    sourceKeys: ["nomina-africana-nguni-naming"],
    gapReasons: {
      alliances: NGUNI_GAPS.alliances,
      casteOrSocialFunction:
        "Aucune fonction héréditaire attestée au niveau du clan. Sibanda est " +
        "aujourd'hui surtout porté au Zimbabwe, où il est donné aussi bien dans " +
        "des familles ndébélé que sotho, ce qui écarte l'hypothèse d'un corps de " +
        "spécialistes propre à un clan.",
      bearers:
        "Le texte intégral de Bryant, qui est la source de référence pour les " +
        "clans nguni orientaux, ne contient aucune occurrence de Sibanda : le " +
        "nom relève de l'aire ndébélé du Zimbabwe, hors du champ géographique " +
        "que Bryant couvre. Aucun porteur décédé n'a donc pu être établi.",
      homonyms:
        "L'absence de Sibanda chez Bryant est elle-même le résultat de la " +
        "recherche : faute de chronique clanique le suivant lignée par lignée, " +
        "les origines multiples que suggèrent les répertoires communautaires ne " +
        "peuvent être ni distinguées ni écartées.",
    },
  },

  PAT_DUBE: {
    ...NGUNI_ISIBONGO,
    origin: {
      oralTraditions: [],
      writtenChronicles: [
        {
          claim:
            "Les Dube sont comptés parmi les Nguni mthethwa. Vers 1650 ils " +
            "descendent avec les Mbonambi la côte du Zululand jusqu'à la " +
            "Mhlathuze. Le clan traverse les règnes de Dingiswayo et de Shaka " +
            "sans perdre son territoire, puis est détruit sous Dingane : son " +
            "chef Nzwakele est tué et le clan dispersé, la plupart de ses " +
            "membres franchissant la Thukela vers le Natal, où le nom est " +
            "aujourd'hui répandu.",
          claimStatus: "established",
          sourceRefs: ["bryant-1929-olden-times"],
        },
      ],
      linguisticReconstructions: [NGUNI_RECONSTRUCTION],
    },
    sourceKeys: ["nomina-africana-nguni-naming", "bryant-1929-olden-times"],
    gapReasons: {
      alliances: NGUNI_GAPS.alliances,
      casteOrSocialFunction:
        "Aucune fonction héréditaire attestée : Bryant décrit les Dube comme un " +
        "clan territorial doté de ses propres chefs, non comme un corps de " +
        "spécialistes.",
      bearers:
        "Le chef Nzwakele, tué sous Dingane, est nommé par Bryant, mais sans " +
        "dates ni généalogie propre ; il documente la dispersion du clan et non " +
        "l'origine du nom, et n'est donc pas enregistré en porteur.",
      homonyms:
        "Bryant distingue une branche Lushozi-Dube sans lui donner d'origine " +
        "séparée : faute de trajectoire distincte attestée, elle est traitée " +
        "comme une subdivision et non comme un homonyme.",
    },
  },

  PAT_MNTUNGWA_PRAISE: {
    transmissionMode: "patrilineal",
    designatedSocialUnit: "lineage",
    origin: {
      oralTraditions: [],
      writtenChronicles: [
        {
          claim:
            "Les abaNtungwa sont, chez Bryant, l'ensemble nguni demeuré sur " +
            "place après la séparation d'avec les Xhosa et les Thembu, datée " +
            "des environs de 1500, et c'est de lui que les Zoulou tirent leur " +
            "descendance. Le groupe se déplace ensuite par fractions vers " +
            "Utrecht et Vryheid, puis au cœur du Zululand.",
          claimStatus: "claimed",
          sourceRefs: ["bryant-1929-olden-times"],
        },
        {
          claim:
            "La tradition ntungwa se dit d'une formule : ils « descendirent " +
            "avec les grands paniers à grain », b'-ehla ngesiLulu, l'isiLulu " +
            "étant un panier d'herbe tressée en forme de calebasse, d'un mètre " +
            "environ, où l'on conservait le grain. Bryant note que la formule " +
            "peut aussi se lire « descendirent à cause des iziLulu », le mot " +
            "ayant pu servir de sobriquet aux étrangers qui apparurent munis de " +
            "ces paniers.",
          claimStatus: "claimed",
          sourceRefs: ["bryant-1929-olden-times"],
        },
      ],
      linguisticReconstructions: [
        {
          claim:
            "Mntungwa relève des izithakazelo — les louanges de clan nguni, " +
            "distinctes de l'isibongo (patronyme) : elles nomment les figures " +
            "marquantes du lignage et se récitent en salutation.",
          claimStatus: "established",
          sourceRefs: ["nomina-africana-nguni-naming"],
        },
        {
          claim:
            "Le terme est contesté par ceux qu'il désigne. Bryant reconnaît " +
            "qu'abaNtungwa est « dans une certaine mesure un terme de " +
            "commodité » et que bon nombre des clans auxquels il l'applique le " +
            "récusent ; il maintient l'appellation faute de mieux et met ces " +
            "clans au défi de s'en donner une autre. L'étiquette est donc celle " +
            "de l'ethnographe autant que celle du groupe.",
          claimStatus: "contested",
          sourceRefs: ["bryant-1929-olden-times"],
        },
      ],
    },
    sourceKeys: [
      "nomina-africana-nguni-naming",
      "ngonipeople-izithakazelo",
      "bryant-1929-olden-times",
    ],
    gapReasons: {
      alliances: NGUNI_GAPS.alliances,
      casteOrSocialFunction:
        "Mntungwa désigne un ensemble de descendance, non un métier : aucune " +
        "charge héréditaire ne s'y attache, et la question ne se pose pas au " +
        "niveau d'une louange de clan.",
      bearers:
        "Bryant rattache à l'ensemble ntungwa la lignée d'où sortent les rois " +
        "zoulou, mais une louange de clan se porte collectivement : lui affecter " +
        "un porteur individuel reviendrait à confondre l'izithakazelo avec " +
        "l'isibongo, que la fiche distingue précisément.",
      homonyms:
        "Aucune lignée homonyme d'origine distincte n'a été trouvée ; les 111 " +
        "occurrences du terme chez Bryant renvoient toutes au même ensemble.",
    },
  },

  // ===========================================================================
  // Buganda — ebika totémiques
  // ===========================================================================
  PAT_FFUMBE: bugandaClan(
    "la civette d'Afrique",
    "Clan Banansangwa, l'un des cinq clans trouvés sur place à l'arrivée de Kintu.",
    "la grenouille (kikerekere), au rang nº 6 de la liste de Roscoe"
  ),
  PAT_LUGAVE: bugandaClan(
    "le pangolin",
    "Clan Banansangwa, l'un des cinq clans trouvés sur place à l'arrivée de Kintu.",
    "le champignon (butiko), au rang nº 11 de la liste de Roscoe"
  ),
  PAT_NGONGE: bugandaClan(
    "la loutre",
    "Clan Banansangwa, l'un des cinq clans trouvés sur place à l'arrivée de Kintu.",
    "la genette (kasimba), au rang nº 4 de la liste de Roscoe"
  ),
  PAT_NJAZA: bugandaClan(
    "le redunca (antilope des roseaux)",
    "Clan Banansangwa, l'un des cinq clans trouvés sur place à l'arrivée de Kintu.",
    "une antilope (njugulu), au rang nº 25 de la liste de Roscoe, qui glose " +
      "lui-même le totem principal par « Roebuck » et non par le redunca"
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
        "Aucune fonction héréditaire attestée pour ce lignage : l'oríkì orílẹ̀ " +
        "dit l'origine et les fondateurs, non un métier transmis.",
      bearers:
        "Une louange de lignage se récite pour le groupe et non pour un " +
        "individu : les fondateurs qu'elle nomme ne sont pas datés par la " +
        "source consultée, et aucun porteur décédé n'a donc pu être établi.",
      homonyms:
        "Aucune lignée homonyme d'origine distincte n'a été trouvée. Un même " +
        "oríkì orílẹ̀ pouvant être partagé par plusieurs familles se réclamant " +
        "de la même localité d'origine, une homonymie ne se distinguerait ici " +
        "d'une origine commune que par une source dédiée, qui manque.",
    },
  },
};

function bugandaClan(totem, banansangwa, akabbiro) {
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
        {
          claim: `Le totem secondaire (akabbiro) de ce clan est ${akabbiro}.`,
          claimStatus: "established",
          sourceRefs: ["roscoe-1911-baganda"],
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
      alliances:
        "Le système ganda ne documente pas d'alliance formelle entre ebika ; " +
        "l'exogamie clanique en est l'inverse.",
      casteOrSocialFunction:
        "Les titres de chef de clan donnés par les sites patrimoniaux ganda " +
        "(Walusimbi pour le Ffumbe, Ndugwa pour le Lugave) ont été cherchés dans " +
        "le texte intégral de Roscoe : Walusimbi y apparaît six fois, mais comme " +
        "détenteur de prérogatives rituelles à l'intronisation, jamais rattaché " +
        "explicitement à son ekika ; Ndugwa n'y figure que dans une liste de noms " +
        "de garçons. La charge héréditaire est donc plausible et non établie.",
      bearers:
        "Le texte intégral de Roscoe a été parcouru pour ce clan : il nomme des " +
        "chefs et des officiants, mais sans généalogie permettant de rattacher " +
        "une personne décédée au clan par une source dédiée.",
      homonyms:
        "Le nom de ce clan est celui de son totem, mot commun du luganda ; " +
        "aucune lignée homonyme d'origine distincte n'a été trouvée.",
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
          claimStatus: "established",
          sourceRefs: ["leslau-1987-geez", "familysearch-ethiopia-naming"],
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
      "leslau-1987-geez",
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
        "Aucune fonction héréditaire attestée au niveau de la tribu : la nisba " +
        "zénète dit une appartenance tribale, non un métier, et Ibn Khaldûn ne " +
        "lui attache aucune spécialisation transmise.",
      bearers:
        "Ibn Khaldûn nomme les souverains des dynasties issues de ces tribus, " +
        "mais une nisba tribale se porte collectivement : verser un émir au " +
        "champ des porteurs ferait passer une histoire dynastique pour " +
        "l'attestation d'un nom, ce que la passe s'interdit.",
      homonyms:
        "L'homonymie est structurelle dans un système de nisba : le nom marque " +
        "l'appartenance à la tribu et non la descendance d'un lignage, de sorte " +
        "que deux porteurs sans parenté le partagent normalement. Ce n'est donc " +
        "pas ici une donnée à recenser.",
    },
  };
}

/**
 * The floor a Mande jamu fiche starts from: the jamu is a patrilineal clan
 * name, and nothing else is assumed. It carries no gap reasons on purpose —
 * every caller writes its own, because a gap reason is a search result and
 * search results do not generalise across names.
 */
function mandeThin() {
  return {
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [JAMU_RECONSTRUCTION],
    },
    sourceKeys: ["jansen-sunjata-paradigm"],
  };
}

function fulbeClan(etymologySearch, bearersSearch) {
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
      alliances:
        "Le dendiraagal (parenté à plaisanterie peule) est documenté comme " +
        "institution mais aucune paire nommant ce clan n'a été trouvée.",
      casteOrSocialFunction:
        "Aucune fonction héréditaire attestée au niveau du clan : la " +
        "quadripartition Diallo, Bâ, Barry, Sow ordonne la descendance et non " +
        "le métier, et les castes de spécialistes du Fouta portent d'autres noms.",
      bearers: bearersSearch,
      homonyms: etymologySearch,
    },
  };
}
