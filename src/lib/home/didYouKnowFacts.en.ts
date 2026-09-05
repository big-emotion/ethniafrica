/**
 * The English "Did you know" bank — the sidecar of `didYouKnowFacts.ts`.
 *
 * Keyed by the French fact's id so the two banks can never drift apart
 * silently: the parity test refuses a key on one side without its twin on
 * the other. Every entry is an agent-produced translation and says so
 * (`provenance: "machine"`, DEC-048); a human review flips that field rather
 * than editing prose in place, which is why the field is a `TranslationKind`
 * and not a literal.
 *
 * What stays verbatim follows the invariant class of REQ-143: a people's
 * name, an autonym or an exonym is the subject of the anecdote, so
 * translating it would repeat the renaming the fact documents; a source
 * title or URL translated stops being findable. Country chips take their
 * English form. “Côte d'Ivoire” keeps its French name on purpose — the
 * state asked for it in 1986, and the anecdote is about that very name.
 *
 * Nothing here is wired into a component yet; the bilingual foundation PR
 * mounts it. Until then the module is read by its tests alone.
 */

import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";

import type { DidYouKnowFact } from "./didYouKnowFacts";

// @req REQ-145
export type DidYouKnowFactTranslation = Omit<DidYouKnowFact, "id"> & {
  provenance: TranslationKind;
};

// @req REQ-145
export const DID_YOU_KNOW_FACTS_EN: Record<string, DidYouKnowFactTranslation> =
  {
    monrovia: {
      headline:
        "The capital of Liberia bears the name of an American president.",
      body: [
        "Monrovia comes from James Monroe, fifth president of the United States. It is one of only two capitals in the world named after an American president — the other is Washington.",
        "The settlement founded in 1822 was called Christopolis. It was renamed in honour of Monroe, whose support had allowed the American Colonization Society to acquire the territory where freed African Americans settled.",
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
      provenance: "machine",
    },
    bantou: {
      headline:
        "“Bantu” is not a people: it is a category coined by a philologist in 1862.",
      body: [
        "Wilhelm Bleek builds the term in A Comparative Grammar of South African Languages, from a root shared by hundreds of languages: ba-, the human plural prefix, and -ntu, the person. Ba-ntu: “the people”.",
        "What Bleek names is a kinship between languages, not an identity. Colonial anthropology, then apartheid with the Bantu Education Act of 1953, turned it into a category of Bantu “races” and “cultures” — a use his classification never carried.",
      ],
      entities: [
        { kind: "family", id: "FLG_BANTU", label: "Bantu languages" },
        { kind: "people", id: "PPL_ZULU", label: "Zoulou" },
        { kind: "people", id: "PPL_XHOSA", label: "Xhosa" },
        { kind: "country", id: "ZAF", label: "South Africa" },
      ],
      tier: "referenced",
      provenance: "machine",
    },
    "cote-ivoire": {
      headline:
        "Côte d'Ivoire bears the name of the goods that were loaded there.",
      body: [
        "Portuguese navigators named this shoreline after its merchandise: Costa do Marfim, the ivory coast. Further east, towards Assinie, people already spoke of the Gold Coast — present-day Ghana.",
        "In 1839, the French officer Bouët-Willaumez gallicises the name and fixes it officially. He does not invent it: he institutionalises a term used for centuries in European languages. These coastal names carved up a trade, not the peoples who lived there.",
      ],
      entities: [
        { kind: "country", id: "CIV", label: "Côte d'Ivoire" },
        { kind: "country", id: "GHA", label: "Ghana" },
      ],
      tier: "referenced",
      provenance: "machine",
    },
    amazigh: {
      headline:
        "“Berber” comes from the Greek barbaros: the one whose language cannot be understood.",
      body: [
        "Passed into Latin as barbarus, the term serves the Romans to designate the non-Latin populations of North Africa; medieval Arab authors take it up, and the French colonial administration turns it into a category. Part of the community now receives it as pejorative, by association with “barbarian”.",
        "The name these peoples give themselves is Amazigh — Imazighen in the plural — and it means “free man”. Kabyles, Chaouis, Rifians, Chleuhs, Mozabites and Tuareg are all Imazighen: branches of a single tree, each with its region and its history.",
      ],
      entities: [
        { kind: "people", id: "PPL_AMAZIGH_MACRO", label: "Amazigh" },
        { kind: "country", id: "MAR", label: "Morocco" },
        { kind: "country", id: "DZA", label: "Algeria" },
      ],
      tier: "referenced",
      provenance: "machine",
    },
    lingala: {
      headline: "The name of Lingala was invented by Belgian missionaries.",
      body: [
        "The language itself was not: its base is Bobangi, the great trade language of the Congo river, spoken by the riverside peoples long before the Europeans arrived.",
        "In the nineteenth century, the colonial administration groups several river populations under a single label, “Bangala” — a name these peoples did not use. It simplifies their language, fixes its spelling, and christens this standardised version Lingala. Modern Lingala keeps roughly 60 to 70% of the Bobangi structure.",
      ],
      entities: [
        { kind: "country", id: "COD", label: "DRC" },
        { kind: "people", id: "PPL_NGALA", label: "Ngala (Bangala)" },
      ],
      tier: "referenced",
      provenance: "machine",
    },
    "personne-relationnelle": {
      headline:
        "In several African languages, one and the same formula defines the person through others.",
      body: [
        "Muntu among the Kongo and the Luba, umuntu in Zulu, motho in Tswana, mɔgɔ in Bambara, onipa in Akan, qof in Somali: the word “person” answers from one language to the next, and is caught in the same construction.",
        "“Umuntu ngumuntu ngabantu” in Zulu — a person is a person through other people; “Onipa nyɛ onipa nkoara” in Akan; “Qof waa qof dad awgiis” in Somali. These formulas define the person by their relations rather than by themselves.",
      ],
      entities: [
        { kind: "family", id: "FLG_BANTU", label: "Bantu languages" },
        { kind: "people", id: "PPL_AKAN", label: "Akan" },
        { kind: "people", id: "PPL_SOMALI", label: "Somali" },
      ],
      tier: "unverified",
      provenance: "machine",
    },
    afrique: {
      headline:
        "The continent's name comes from a people that fitted inside one province.",
      body: [
        "The Romans call the inhabitants of the Carthage region Afri — the name is linked to the Ifren and to the Berber ifri, “cave”. Africa first designates their province alone: present-day Tunisia and eastern Algeria, no more.",
        "The Arabs make it Ifrīqiya, over the same perimeter. Only in the Middle Ages does the word slide over every land south of the Mediterranean. A people from one province ended up naming thirty million square kilometres and fifty-four states — none of which had named itself that way.",
      ],
      entities: [
        { kind: "country", id: "TUN", label: "Tunisia" },
        { kind: "country", id: "DZA", label: "Algeria" },
        { kind: "family", id: "FLG_BERBERE", label: "Berber languages" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "Jeune Afrique — Quelle est l'origine du mot « Afrique » ?",
          url: "https://www.jeuneafrique.com/115118/archives-thematique/quelle-est-l-origine-du-mot-afrique/",
          tier: "referenced",
          notes:
            "Several etymologies coexist (Ifren, ifri “cave”, Punic faraqa). The fact retains the widening of the perimeter, which is not disputed, not the etymon.",
        },
      ],
      provenance: "machine",
    },
    "burkina-faso": {
      headline:
        "The name of Burkina Faso is written in three languages at once.",
      body: [
        "Burkina comes from Mooré and means “upright”; faso comes from Dioula, where fa is the father and so the house — the homeland. The demonym, Burkinabè, takes the Fula suffix -ɓe, the one found in Fulɓe. Three languages of the country in two words and an adjective.",
        "Thomas Sankara proclaims it on 4 August 1984, replacing Upper Volta — a river's name, given by the colonial administration, which said nothing of the sixty-odd peoples it covered. The new name chooses none of them: it makes them speak together.",
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
      provenance: "machine",
    },
    cameroun: {
      headline: "Cameroon bears the name of a crustacean.",
      body: [
        "In 1472, the Portuguese navigator Fernão do Pó sails up the Wouri estuary and christens it Rio dos Camarões — the river of prawns, after what he sees teeming in it.",
        "The river's name then passes to the territory, and changes mouth with each administration: Camarões in Portuguese, Kamerun under the Germans, Cameroon in English, Cameroun in French. Four spellings for a fishing observation.",
      ],
      entities: [
        { kind: "country", id: "CMR", label: "Cameroon" },
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
      provenance: "machine",
    },
    "benin-dahomey": {
      headline: "Benin took a name that belonged to none of its peoples.",
      body: [
        "Until 1975 the country was called Dahomey, after the Fon kingdom of Abomey — a legitimate name, but that of a single group among the fifty or so the country counts. Mathieu Kérékou's government replaces it with Benin, after the bight onto which the country opens, precisely because that name belonged to nobody.",
        "The calculation has its irony: the Bight of Benin itself takes its name from the Kingdom of Benin, which lies in Nigeria and of which present-day Benin has never been part. The country traded the name of one of its own kingdoms for that of a neighbour's kingdom.",
      ],
      entities: [
        { kind: "country", id: "BEN", label: "Benin" },
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
      provenance: "machine",
    },
    "nigeria-flora-shaw": {
      headline: "Nigeria was named in a newspaper column.",
      body: [
        "On 8 January 1897, Flora Shaw publishes in the Times a column in which she proposes to call the territories administered by the Royal Niger Company “Nigeria” — the name in use, “Royal Niger Company Territories”, being impracticable. She is then the paper's colonial editor, and the best-paid journalist of her time.",
        "In 1902 she marries Frederick Lugard, who becomes governor-general and takes the name up in 1914 when merging the Northern and Southern protectorates. The most populous country in Africa therefore bears a name of convenience, found by a columnist to avoid a circumlocution.",
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
            "Press fact-check citing the Times article of 8 January 1897; official adoption by Lugard dates from 1914.",
        },
      ],
      provenance: "machine",
    },
    "zimbabwe-grand-zimbabwe": {
      headline:
        "Zimbabwe bears the name of a monument that a law forbade attributing to Africans.",
      body: [
        "Dzimba dza mabwe: “houses of stone”, in Shona. The Great Zimbabwe site was an embarrassment: in 1902, Cecil Rhodes funds an excavation with the explicit instruction to establish a non-African origin, and the Phoenicians and the Queen of Sheba are invoked in turn.",
        "In 1970, the Rhodesian government forbids any official publication from stating that the site is an African creation. The archaeologist Peter Garlake, who maintained it, is imprisoned and then expelled. In 1980, the independent country takes the name of the ruins — the shortest possible answer to seventy years of denial.",
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
            "Documents the 1902 excavation commission and the Rhodesian censorship of 1970.",
        },
      ],
      provenance: "machine",
    },
    "prefixes-bantous": {
      headline: "Lesotho and Botswana are not names: they are conjugations.",
      body: [
        "Mosotho, a person; Basotho, the people; Sesotho, the language; Lesotho, the country. The root does not move, only the prefix changes — and it carries everything. Motswana, Batswana, Setswana, Botswana follow exactly the same grammar.",
        "These class prefixes are the most characteristic feature of the Bantu languages. Two states have made them their official name: read correctly, they announce that they are the country of a people, and along the way give what is needed to name that people and its language without error.",
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
      provenance: "machine",
    },
    "peul-dix-noms": {
      headline: "The same people changes name at every border it crosses.",
      body: [
        "They call themselves Fulɓe in the plural, Pullo in the singular. French says Peul, borrowed from Wolof; English says Fulani, borrowed from Hausa; one also reads Fula, and Fellata in Chad and Sudan. Their language is called Pulaar in the west and Fulfulde in the east.",
        "None of these names is wrong, and only one is theirs. The scattering of the vocabulary follows that of the people: present from Senegal to Sudan, the Fulɓe have been named by each of their neighbours, then by each colonial administration that met them, in whatever language it had to hand.",
      ],
      entities: [
        { kind: "people", id: "PPL_FULANI", label: "Fulɓe (Peul)" },
        { kind: "country", id: "SEN", label: "Senegal" },
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
      provenance: "machine",
    },
    "khoikhoi-hottentot": {
      headline: "“Hottentot” may be a mockery of the sound of a language.",
      body: [
        "The most widespread hypothesis holds that the Dutch settlers of the Cape, arriving in the 1650s, coined the word by imitating the clicks of the Khoekhoe language — something like “stutterer”. It is not established: no earlier attestation supports it, and another lead derives it from a formula repeated in a Nama song.",
        "What is known for certain is what the word became: an insult, held today to be deeply offensive in South Africa. The autonym, for its part, does not vary — Khoekhoen, “the men of men”.",
      ],
      entities: [
        { kind: "people", id: "PPL_KHOIKHOI", label: "Khoikhoi" },
        { kind: "country", id: "ZAF", label: "South Africa" },
        { kind: "country", id: "NAM", label: "Namibia" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "Dictionary of South African English — Hottentot",
          url: "https://dsae.co.za/entry/hottentot/e03109",
          tier: "referenced",
          notes:
            "The dictionary gives the click hypothesis as the most widespread while noting the absence of any earlier attestation.",
        },
      ],
      provenance: "machine",
    },
    "pygmee-homere": {
      headline:
        "“Pygmy” is a Greek unit of measurement laid over peoples who have no common name.",
      body: [
        "Pygmē designates in Greek the cubit — from the elbow to the knuckles, about thirty-five centimetres. Homer and Herodotus draw from it the Pygmaioi, a tiny, legendary people, busy in the Iliad waging war on cranes. The word designated nobody real before Europe laid it over Central Africa.",
        "Baka, Bagyeli, Aka, Twa, Mbuti have neither a common language, nor a common territory, nor a common identity, and none calls itself that: each has its own name. There is, moreover, no replacement term that covers them all — the best sign that the group it claims to name does not exist.",
      ],
      entities: [
        {
          kind: "people",
          id: "PPL_PYGMEES_AUTOCHTONES",
          label: "Peuples autochtones des forêts d'Afrique centrale",
        },
        { kind: "people", id: "PPL_TWA", label: "Twa" },
        { kind: "country", id: "CMR", label: "Cameroon" },
        { kind: "country", id: "COD", label: "DRC" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "Online Etymology Dictionary — pygmy",
          url: "https://www.etymonline.com/word/pygmy",
          tier: "referenced",
          notes:
            "Establishes pygmē “cubit” and the Homeric usage; the absence of a collective replacement term is documented by the organisations defending the peoples concerned.",
        },
      ],
      provenance: "machine",
    },
    "lac-lac": {
      headline: "Several maps of Africa say the same thing twice.",
      body: [
        "Nyasa means “lake” in Yao and in Chichewa: Lake Nyasa is Lake Lake, and Nyasaland was the country of the Lake. Tsade means “lake” in Kanuri: Lake Chad is Lake Lake, and the country bears its name today. Ṣaḥrāʾ means “desert” in Arabic: the Sahara is the desert of the Desert.",
        "The mechanism is always the same. The traveller asks the name of a place, is told what it is, and writes the answer down as a proper name. These tautological place names mark the exact spot where the conversation failed.",
      ],
      entities: [
        { kind: "country", id: "MWI", label: "Malawi" },
        { kind: "country", id: "TCD", label: "Chad" },
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
      provenance: "machine",
    },
    tombouctou: {
      headline: "Nobody knows what Timbuktu means.",
      body: [
        "At least four etymologies fight over the city. The most often told makes it Tin Buktu, “the place of Buktu”, an old Tuareg woman to whom the nomads entrusted their goods near a well. The Malian historian Sékéné Cissoko reads it rather as tin, the place, and buktu, a small dune.",
        "The explorer Heinrich Barth, for his part, dismissed the well and proposed the Songhai tùmbutu, a hollow in the sand — the city being built in a basin. None prevails. The most mythical name in Africa is the one we are least sure of.",
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
            "The published fact is the disagreement itself. The competing etymologies belong to oral tradition and to authors' hypotheses: none is attested, hence the “unverified” tier of the fact.",
        },
      ],
      provenance: "machine",
    },
    "fleuve-niger": {
      headline: "The Niger river owes nothing to the Latin niger.",
      body: [
        "The name most probably comes from the Tuareg egerew n-igerewen, “the river of rivers”, used on the middle course around Timbuktu and shortened by the middlemen of the trans-Saharan trade. The resemblance to the Latin niger, “black”, did the rest: it fixed the spelling and suggested a meaning that was not there.",
        "The riverside peoples all said much the same thing in their own language: Joliba in Mandingo, Isa Ber in Songhai, Orimili in Igbo — “great river” —, Kwara in Hausa, Oya in Yoruba. Two states today bear the name that Europe misheard.",
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
            "Gives the alteration of the Tuareg egerew n-igerewen under the influence of the Latin niger as the most probable hypothesis, not as a certainty.",
        },
      ],
      provenance: "machine",
    },
    ethiopie: {
      headline:
        "Ethiopia has two names from outside, and only one from within.",
      body: [
        "Aithiopía is Greek and means “burnt face”. Abyssinia comes from the Arabic habasha, which designated the populations of the Horn. Two exonyms, laid down by two neighbours, for a country that never stopped naming itself.",
        "The autonym is ʾĪtyōṗṗyā, attested in the Ge'ez texts and taken up as the official name of the state. Abyssinia, for its part, has fallen out of use: the country dropped one of the two names it had been given and kept the one it could claim.",
      ],
      entities: [
        { kind: "country", id: "ETH", label: "Ethiopia" },
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
      provenance: "machine",
    },
    guinee: {
      headline:
        "Four countries bear the name Guinea, and nobody knows what it means.",
      body: [
        "One lead derives it from the Berber aginaw, “black man” — whence akal n-iguinawen, “the land of the black men”; the word appears on European maps from the fourteenth century onwards. Another, put forward by the geographer Leo Africanus in 1526, sees in it a deformation of Djenné, the great trading city on the Niger.",
        "Neither is established. The name nonetheless served to carve up the coast, then to christen Guinea, Guinea-Bissau and Equatorial Guinea — and, at the other end of the world, New Guinea, so named by a navigator who found its inhabitants to have a familiar look.",
      ],
      entities: [
        { kind: "country", id: "GIN", label: "Guinea" },
        { kind: "country", id: "GNB", label: "Guinea-Bissau" },
        { kind: "country", id: "GNQ", label: "Equatorial Guinea" },
      ],
      tier: "unverified",
      sources: [
        {
          title: "WorldAtlas — Why are so many countries called Guinea?",
          url: "https://www.worldatlas.com/geography/why-are-so-many-countries-called-guinea-56865.html",
          tier: "unverified",
          notes:
            "The two competing etymologies (Berber aginaw, Djenné) are authors' conjectures; neither is demonstrated.",
        },
      ],
      provenance: "machine",
    },
    tanzanie: {
      headline: "Tanzania is a portmanteau less than a year old.",
      body: [
        "Tanganyika becomes independent in 1961, Zanzibar in 1963. The two merge in April 1964, and the state born of the union looks for a name: it will be Tanzania, from the first three letters of the one and the first three of the other.",
        "It is one of the rare names of an African state that comes neither from a people, nor from a river, nor from an explorer. It is the minutes of a political addition, and it says so openly.",
      ],
      entities: [
        { kind: "country", id: "TZA", label: "Tanzania" },
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
      provenance: "machine",
    },
    mozambique: {
      headline:
        "Mozambique bears the name of a man, taken for that of a place.",
      body: [
        "Mussa Bin Bique was a sheikh and merchant established on the island that commands the coast. When Vasco da Gama's expedition lands there in 1498, the Portuguese hear his name, take it for that of the place, and write Moçambique.",
        "The island becomes the colonial capital in the sixteenth century, then the name spills over the whole hinterland. A country of more than thirty million inhabitants is therefore named after a fifteenth-century trader, through a misunderstanding never corrected.",
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
            "Attests the island's role as a trading post and then colonial capital; the attribution of the name to sheikh Mussa Bin Bique is the usual reading of the Portuguese chronicles.",
        },
      ],
      provenance: "machine",
    },
    "sierra-leone": {
      headline: "There is no agreement on who named Sierra Leone, nor on why.",
      body: [
        "The usual account attributes Serra Lyoa, “Lion Mountains”, to the Portuguese Pedro de Sintra around 1462. The Sierra Leonean historian C. Magbaily Fyle disputes it: the name is attested before that date, and the attribution would be a misreading copied from one historian to the next.",
        "The reason for the name splits in two as well: for some the relief of the coast suggested lion's teeth, for others it was the thunder roaring above the hills. English sailors make it Sierra Leoa in the sixteenth century, then Sierra Leone; the British make it official in 1787.",
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
            "Reports C. Magbaily Fyle's challenge to the attribution to Pedro de Sintra.",
        },
      ],
      provenance: "machine",
    },
    // ————————————————————————————————————————————————————————————————————
    // The names neighbours give
    // ————————————————————————————————————————————————————————————————————
    "iteso-bakedi": {
      headline:
        "The Iteso were long designated by a word that means “the naked ones”.",
      body: [
        "Bakedi — also written Bakidi — is the name the Baganda give them in the nineteenth century. It qualifies a way of dressing, judged from outside, and it is now held to be insulting.",
        "Two other words surround the first without saying so. Teso names not the people but its territory, and Ateso its language: three entities, three words, which usage has ended up confusing into one. The colonial border of 1902 did the rest, separating the Iteso of Uganda from those of Kenya.",
      ],
      entities: [
        { kind: "people", id: "PPL_ITESO", label: "Iteso" },
        { kind: "country", id: "UGA", label: "Uganda" },
        { kind: "country", id: "KEN", label: "Kenya" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "SIL Ethnologue — Ateso (teo)",
          url: "https://www.ethnologue.com/language/teo/",
          tier: "official",
          notes:
            "Attests the names Teso, Bakedi and Wamia and the Uganda–Kenya distribution. The meaning of Bakedi and its pejorative character are reported by this people's entry in the atlas.",
        },
      ],
      provenance: "machine",
    },
    "datoga-mangati": {
      headline:
        "The Datooga are known under two names, and the more common one means “the enemies”.",
      body: [
        "Mang'ati is the word by which the Maasai and several neighbouring Bantu peoples designate them. It is not a description, it is a position: the name says the relationship, not the people.",
        "The other common name, Barabaig, is that of the largest of their subgroups. The Datooga count at least ten. A people called by the name of its most visible fraction is a people of which only a part has been counted — the error is one of census as much as of vocabulary.",
      ],
      entities: [
        { kind: "people", id: "PPL_DATOGA", label: "Datooga" },
        { kind: "country", id: "TZA", label: "Tanzania" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "SIL Ethnologue — Datooga (tcc)",
          url: "https://www.ethnologue.com/language/tcc/",
          tier: "official",
          notes:
            "Attests the endonym Datooga, the variants Tatog and Barabaig and the subgroup relationship.",
        },
        {
          title: "Glottolog — Datooga (dato1239)",
          url: "https://glottolog.org/resource/languoid/id/dato1239",
          tier: "official",
        },
      ],
      provenance: "machine",
    },
    "azande-niamniam": {
      headline:
        "A slander against the Azande ended up naming a plant and entering Turkish.",
      body: [
        "Azande means in their language “those who own much land”. The name Europe retained in the nineteenth century is another: Niam-Niam, used by the Arab neighbours and then by the explorers, and supposed to imitate the sound of a mouth eating. It accused a whole people of cannibalism.",
        "The word travelled further than the accusation. The Turkish yamyam derives from it. A balsam described by botanists still bears the name Impatiens niamniamensis. A nineteenth-century slander thus survives in a nomenclature that no longer knows what it repeats.",
      ],
      entities: [
        { kind: "people", id: "PPL_AZANDE_SUD", label: "Azande" },
        { kind: "country", id: "SSD", label: "South Sudan" },
        {
          kind: "country",
          id: "COD",
          label: "Democratic Republic of the Congo",
        },
        { kind: "country", id: "CAF", label: "Central African Republic" },
      ],
      tier: "referenced",
      sources: [
        {
          title:
            "Evans-Pritchard, E. E. — Witchcraft, Oracles and Magic Among the Azande. Oxford University Press, 1937",
          tier: "referenced",
          notes:
            "The reference ethnography on the Azande, and the source of the distinction between the people and the reputation made for it.",
        },
        {
          title: "SIL Ethnologue — Zande (zne)",
          url: "https://www.ethnologue.com/language/zne/",
          tier: "official",
          notes:
            "Attests the ethnonym and its variants, including Niam-Niam, recorded as a derogatory name.",
        },
      ],
      provenance: "machine",
    },
    "wonnin-godie": {
      headline:
        "The official name of the Wonnin is a neighbour's nickname: “chimpanzee-panther”.",
      body: [
        "Gwèdji, in the Neyo language, pairs two animals to describe a temperament judged belligerent. The Neyo apply it to their neighbours; the gallicised form Godié is today that of the maps, the censuses and the language codes.",
        "Wonnin is the name the group gives itself. It has never left domestic use, which leaves the nickname to occupy the public space alone — the ordinary case on this page: the name that circulates is rarely the one chosen.",
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
            "Attests the name Godié and its variants. The Neyo etymology Gwèdji is reported by this people's entry in the atlas.",
        },
      ],
      provenance: "machine",
    },
    "murle-moden": {
      headline:
        "Three neighbours gave the Murle three different names, and the Murle have a single word for all three.",
      body: [
        "Beir among the Dinka, Jebe among the Luo and the Nuer, Ajibba among the Anuak: British colonial literature records these three forms before the autonym Murle is recognised. A people bears as many names as it has neighbours.",
        "The symmetry is exact on the other side. In Murle, all non-Murle are moden — a single word, which says at once the stranger and the enemy. Naming one's neighbours and being named by them are the same gesture, taken in both directions.",
      ],
      entities: [
        { kind: "people", id: "PPL_MURLE", label: "Murle" },
        { kind: "country", id: "SSD", label: "South Sudan" },
        { kind: "country", id: "ETH", label: "Ethiopia" },
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
            "Attests the ethnonym and the neighbouring exonyms. The meaning of moden is reported by this people's entry in the atlas.",
        },
      ],
      provenance: "machine",
    },
    "kirdi-paien": {
      headline:
        "“Kirdi” designates no people: it designates forty peoples who refused Islam.",
      body: [
        "The word comes from Kanuri-Hausa and means pagan. The Islamised populations of northern Cameroon and Chad — Fula, Mandara, Kotoko — apply it to those that are not. The first Western mention dates from Major Denham's travel account, in 1826, in the form Kerdies.",
        "It covers more than forty peoples with no linguistic or cultural kinship, whose only common ground is that refusal. Since the 1990s, a political movement has turned it into “Kirditude” and uses it as a banner — one of the rare cases where a victor's insult is taken up by those it targeted.",
      ],
      entities: [
        { kind: "people", id: "PPL_KIRDI", label: "Kirdi" },
        { kind: "country", id: "CMR", label: "Cameroon" },
        { kind: "country", id: "TCD", label: "Chad" },
        { kind: "country", id: "NGA", label: "Nigeria" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "SIL Ethnologue — Mafa (maf)",
          url: "https://www.ethnologue.com/language/maf/",
          tier: "official",
          notes:
            "Attests one of the languages gathered under the label. The etymology and Denham's 1826 mention are reported by this people's entry in the atlas.",
        },
      ],
      provenance: "machine",
    },
    "bambara-refus": {
      headline: "Bambara probably means “those who refuse”.",
      body: [
        "The etymology is debated — it has been linked to Arabic as much as to Mandingo — but the meaning the eighteenth-century sources retain is stable: infidel, unbeliever. The word is then used by the Islamised Mandingo to designate the Bamana who remained animist.",
        "Bamana is the form the speakers use. Bambara, for its part, followed the opposite path to most of the names on this page: carried by usage until it lost its charge, it names today a vehicular language that millions of people speak without hearing the original reproach in it.",
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
            "Attests the forms Bambara and Bamana and the vehicular status of the language. The derogatory etymology is reported by this people's entry in the atlas, which gives it as debated.",
        },
      ],
      provenance: "machine",
    },
    "dogon-habe": {
      headline:
        "In the older sources, the Dogon are called Habe — a Fula word for “stranger”.",
      body: [
        "Habe is used by the Fula to designate those who refused Islamisation; the word says at once the stranger and the peasant, and it is used pejoratively. The older references regularly put it in the place of Dogon.",
        "Dogon has ended up prevailing everywhere, including among those concerned. What the single name masks is that it covers a dozen languages and some fifty sub-dialects, many of which are not mutually intelligible: Dogon unity is cultural and territorial before it is linguistic.",
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
            "Attests the territory and the designation Dogon. The Fula exonym Habe and its meaning are reported by this people's entry in the atlas.",
        },
      ],
      provenance: "machine",
    },
    "le-nom-est-une-reponse": {
      headline:
        "Three peoples of West Africa bear as their name the answer an ancestor gave to a question.",
      body: [
        "The Nankana of Ghana have been Frafra administratively since the British. The word is the corruption of a greeting in Gurune, Ya fara fara? — “how is your work, your toil?”. The polite formula was taken for the name of the people who uttered it.",
        "The same accident repeats twice. Busanga, the exonym of the Bissa, comes from bisag gua — “Bissa man” —, the answer given to the first Europeans who asked who they were. And the Ma'di of the Nile report that their name comes from madi, “a person”, answered in the same circumstances. Three times, the question “who are you?” produced a name that was not one.",
      ],
      entities: [
        { kind: "people", id: "PPL_NANKANA", label: "Nankana (Frafra)" },
        { kind: "people", id: "PPL_BUSANSI", label: "Bissa" },
        { kind: "people", id: "PPL_MADI", label: "Ma'di" },
        { kind: "country", id: "GHA", label: "Ghana" },
        { kind: "country", id: "BFA", label: "Burkina Faso" },
        { kind: "country", id: "UGA", label: "Uganda" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "SIL Ethnologue — Farefare (gur)",
          url: "https://www.ethnologue.com/language/gur/",
          tier: "official",
          notes: "Attests the name Frafra and its variants.",
        },
        {
          title: "SIL Ethnologue — Bisa (bib)",
          url: "https://www.ethnologue.com/language/bib/",
          tier: "official",
          notes: "Attests the forms Bissa, Busansi and Busanga.",
        },
        {
          title: "SIL Ethnologue — Ma'di (mhi)",
          url: "https://www.ethnologue.com/language/mhi/",
          tier: "official",
          notes:
            "Attests the ethnonym. The three origin accounts are reported by the AFRIK entries of the peoples concerned, which give them as traditional.",
        },
      ],
      provenance: "machine",
    },
    "guere-wobe": {
      headline:
        "One and the same people is called Guéré in Côte d'Ivoire, Krahn in Liberia, and Wè at home.",
      body: [
        "Wè is the name this people gives itself — the sources gloss it “the men who forgive easily”. Guéré is the exonym a French colonial administrator introduced, and France added an internal division to it, Guéré in the south, Wobé in the north, which matched no pre-existing cultural or linguistic border.",
        "On the other side of the colonial line, in Liberia, the same people are named Krahn by their Kru neighbours. Four names for one people, three of which come from outside — and the invented division became institutionalised until it came true.",
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
            "The article that raises the question of this group's identity on either side of the Liberia–Côte d'Ivoire border.",
        },
        {
          title: "SIL Ethnologue — Wè Southern (gxx)",
          url: "https://www.ethnologue.com/language/gxx/",
          tier: "official",
          notes: "Attests the names Wè, Guéré, Wobé and Krahn.",
        },
      ],
      provenance: "machine",
    },
    // ————————————————————————————————————————————————————————————————————
    // The names the administration created
    // ————————————————————————————————————————————————————————————————————
    "bamileke-cent-royaumes": {
      headline:
        "“Bamiléké” is a German label laid over a hundred or so kingdoms.",
      body: [
        "The colonial administration of Kamerun introduces it from 1884 to designate collectively the populations of the western highlands. The etymology remains debated; one reading renders it “the people from below”, in reference to the position of the newcomers from the northern plains.",
        "Under the single word there are a hundred or so fondoms, each with its language, its chief and its history — and it is by the name of his fondom that a Bamiléké ordinarily designates himself. The label erased that diversity before being instrumentalised in the political tensions after independence.",
      ],
      entities: [
        { kind: "people", id: "PPL_BAMILEKE", label: "Bamiléké" },
        { kind: "country", id: "CMR", label: "Cameroon" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "SIL Ethnologue — sous-groupe bamiléké",
          url: "https://www.ethnologue.com/subgroup/589/",
          tier: "official",
          notes:
            "Attests the plurality of languages gathered under the label. The German administrative origin and the debated etymology are reported by this people's entry in the atlas.",
        },
      ],
      provenance: "machine",
    },
    "sara-douzaine": {
      headline:
        "The Sara never called themselves Sara: the word comes from those who watched them.",
      body: [
        "It designates a set of non-Muslim peoples of southern Chad whose languages are mutually intelligible. Each of them names itself otherwise — Ngambay, Sar, Mbay — and none used the collective term.",
        "The French colonial administration amplified it, and independence gave it a political reality it did not have. A grouping made from outside for the convenience of classification ends up producing the group it claimed to describe.",
      ],
      entities: [
        { kind: "people", id: "PPL_SARA", label: "Sara" },
        { kind: "country", id: "TCD", label: "Chad" },
        { kind: "country", id: "CAF", label: "Central African Republic" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "SIL Ethnologue — Ngambay (sba)",
          url: "https://www.ethnologue.com/language/sba/",
          tier: "official",
          notes:
            "Attests one of the languages gathered under the label and the name this group gives itself.",
        },
        {
          title: "Glottolog — Ngambay (ngam1268)",
          url: "https://glottolog.org/resource/languoid/id/ngam1268",
          tier: "official",
        },
      ],
      provenance: "machine",
    },
    "bete-plantation": {
      headline:
        "The Bété as a people were assembled by the colonial administration from 93 subgroups.",
      body: [
        "The term is of local origin and carries no detectable colonial charge; what is colonial is the perimeter. It is said to have emerged as a generic designation for the populations working on the plantations, before being fixed as a French administrative category.",
        "These 93 subgroups had no precolonial political unity. Magwé, the oldest traditional ethnonym, is shared with the Wè, from whom the Bété claim a common ancestor — a kinship the new label made invisible.",
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
            "The study that frames the formation of the Bété people as a historical process rather than a given.",
        },
        {
          title: "Ethnologue — Bété, Daloa (bev)",
          url: "https://www.ethnologue.com/language/bev/",
          tier: "official",
          notes:
            "Attests that three distinct languages bear the name Bété today.",
        },
      ],
      provenance: "machine",
    },
    "bassa-nge-distinction": {
      headline:
        "A colonial name, for once, prevented a confusion instead of creating one.",
      body: [
        "Two unrelated peoples — the Bassa Nge, of Nupe origin, and the Bassa Komu, whose language is Benue-Congo — migrated at almost the same time to the same British colonial province, known as Bassa province. Under the single name of Bassa, they would have been counted as one.",
        "The administrators added the Nupe suffix Nge to tell them apart. The distinction still holds. It is the exception that measures the rule: elsewhere, the same administration spent its time melting into one box peoples that nothing brought together.",
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
            "Attests the Nupe affiliation of the Bassa Nge, and hence their distance from the Bassa Komu.",
        },
        {
          title: "SIL Ethnologue — Nupe-Nupe-Tako (nup)",
          url: "https://www.ethnologue.com/language/nup/",
          tier: "official",
        },
      ],
      provenance: "machine",
    },
    "tswa-recensement": {
      headline:
        "The Vatswa disappear at every census, absorbed into a neighbouring box.",
      body: [
        "Mozambican censuses count them as Tsonga. The label Shangaan, drawn from the name of the chief Soshangane, was applied to them by extension even though the Vatswa historically precede his empire.",
        "A name with no administrative box has no statistical existence: it appears in no table, hence in no public policy. The confusion goes back to the Portuguese colonial administration, which wrote Tshwa, and it has survived every state that followed.",
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
            "Attests Xitswa as a distinct language and its competing names.",
        },
        {
          title: "CLEAR Global — Language data for Mozambique (2024)",
          url: "https://clearglobal.org/language-data-for-mozambique/",
          tier: "referenced",
          notes:
            "Documents the gap between the languages actually spoken and the census categories.",
        },
      ],
      provenance: "machine",
    },
    "hutu-cartes-identite": {
      headline:
        "Nobody agrees on what Hutu means, and an administration made a race of it.",
      body: [
        "The etymology has been disputed for a century. Ernest Viaene, in 1910, proposes “slave”. René Bourgeois refutes him and proposes the opposite, “lords” — among the Mongo of the Congo, the related words Bahoto and Bawoto do designate rulers. The word those concerned use is Abahutu.",
        "The uncertainty troubled nobody. In the 1920s, the Belgian colonial administration institutes compulsory ethnic identity cards and turns the Hutu–Tutsi distinction into a fixed hierarchy, settled notably on the number of cows owned. A category whose meaning was not established was made administratively irreversible.",
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
            "Attests the institution of ethnic identity cards by the Belgian colonial administration and its criteria.",
        },
        {
          title: "SIL Ethnologue — Kirundi (run)",
          url: "https://www.ethnologue.com/language/run",
          tier: "official",
          notes:
            "Attests the language common to the three categories. The two competing etymologies are reported by this people's entry in the atlas, which gives them as debated.",
        },
      ],
      provenance: "machine",
    },
    "kasem-gurunsi": {
      headline:
        "“Gurunsi” means “iron does not penetrate”: it was the name of a troop, not of a people.",
      body: [
        "The word is of Zarma origin. It designated the soldiers the warlord Babatu recruited in the 1890s from several groups of the region — a formula of protection, borne by men reputed invulnerable to weapons.",
        "The European colonisers took it up as the name of a people. The Kasena, whom it encompasses, have no close linguistic or cultural kinship with all those it covers. And the Franco-British partition of 1898 cut them into two communities, one in Ghana, the other in Burkina Faso.",
      ],
      entities: [
        { kind: "people", id: "PPL_KASENA", label: "Kasena" },
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
            "Attests the language, the autonym Kasena and the distribution on either side of the border.",
        },
        {
          title: "WALS Online — Kasem",
          url: "https://wals.info/languoid/lect/wals_code_ksm",
          tier: "official",
        },
      ],
      provenance: "machine",
    },
    // ————————————————————————————————————————————————————————————————————
    // The names trade left behind
    // ————————————————————————————————————————————————————————————————————
    "dioula-metier": {
      headline: "The Dioula bear a trade name as the name of their people.",
      body: [
        "Dioula is a Mandingo common noun: merchant, itinerant trader. It came to apply to the Islamised Mande communities specialised in long-distance trade, until it became their ethnonym. In English-speaking West Africa, the same networks are called Wangara.",
        "The people itself says Julakan, “the people of trade” — it therefore assumes the trade as an identity. One trap remains for the hurried reader: the Diola of Casamance have nothing to do with them, neither language, nor family, nor history. Two names alike to the eye, two unrelated peoples.",
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
            "Attests the spellings Dioula, Jula, Dyula and the area of the trading networks.",
        },
      ],
      provenance: "machine",
    },
    "teke-vendre": {
      headline: "In the Teke language, “teke” means to sell.",
      body: [
        "The people's name is the verb of its historical activity. The Bantu prefix gives BaTeke in the plural, MuTeke in the singular: “those of trade”, in a single word.",
        "It is the same gesture as among the Dioula, three thousand kilometres away and in another language family. When a people holds the routes, it is the routes that end up naming it.",
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
            "Attests the ethnonym and its prefixed forms. The meaning of the root is reported by this people's entry in the atlas.",
        },
      ],
      provenance: "machine",
    },
    "tetela-watetera": {
      headline:
        "“Batetela” appeared in European geography journals between 1885 and 1887.",
      body: [
        "The word derives from Watetera, an Arabic term that designated the populations of the Maniema at the time of the slave trade. It enters scholarly literature with the explorers, and has never left it: it is today the common name.",
        "The name the people gives itself says something else. Motetela is said to come from a local deity, and translates as “the one who does not laugh” or “the one who cannot be mocked”. Two names, two points of view, and only one was printed.",
      ],
      entities: [
        { kind: "people", id: "PPL_TETELA", label: "Tetela" },
        {
          kind: "country",
          id: "COD",
          label: "Democratic Republic of the Congo",
        },
      ],
      tier: "unverified",
      sources: [
        {
          title: "Tangaza University — A Collection of 100 Tetela Proverbs",
          url: "https://afriprov.tangaza.ac.ke/wp-content/uploads/2008/11/ebooks_tetela.pdf",
          tier: "referenced",
          notes:
            "A collection of proverbs in Tetela. It documents the language, not the etymology of the ethnonym: the two origins reported here come from this people's entry in the atlas and have no dedicated source, hence the low reliability of the fact.",
        },
      ],
      provenance: "machine",
    },
    "tabwa-attache": {
      headline:
        "The name of the Tabwa may come from a verb of their language meaning “to be tied”.",
      body: [
        "The connection refers to the period when they were caught up in the slave trade. If the etymology holds, this is a people that bears the name of what was done to it.",
        "Tabwa identity is itself partly colonial: what is called the Tabwa today was a series of distinct villages, with different histories, which the Belgian administration gathered under a single name. The boundary with the neighbouring Lungu remains blurred, and several sources confuse the two.",
      ],
      entities: [
        { kind: "people", id: "PPL_TABWA", label: "Tabwa" },
        {
          kind: "country",
          id: "COD",
          label: "Democratic Republic of the Congo",
        },
        { kind: "country", id: "ZMB", label: "Zambia" },
      ],
      tier: "unverified",
      sources: [
        {
          title:
            "Roberts, Allen F. — The Rising of a New Moon: A Century of Tabwa Art. University of Michigan Museum of Art, 1985",
          tier: "referenced",
          notes:
            "The reference study on the Tabwa and on the colonial formation of their identity. The etymology “to be tied” is reported by this people's entry in the atlas as a conjecture, hence the low reliability of the fact.",
        },
        {
          title: "SIL Ethnologue — Taabwa (tap)",
          url: "https://www.ethnologue.com/language/tap/",
          tier: "official",
        },
      ],
      provenance: "machine",
    },
    "angolar-naufrage": {
      headline:
        "The Angolares of São Tomé bear the name of the country from which their ancestors never completed the journey.",
      body: [
        "Tradition reports that a slave ship was wrecked off the southern coast of the island around 1540, and that the survivors founded a maroon community in the forests of the interior. The ethnonym refers directly to Angola, the region of origin of most of their ancestors.",
        "The name is therefore a point of departure turned into an identity — and it is regularly misused: it is given to all the creole speakers of the island, whereas it designates this particular community, historically stigmatised as the bottom of the São Toméan social ladder.",
      ],
      entities: [
        { kind: "people", id: "PPL_ANGOLAR", label: "Angolares" },
        { kind: "country", id: "STP", label: "São Tomé and Príncipe" },
      ],
      tier: "referenced",
      sources: [
        {
          title:
            "Bouyer et al. — The Genes of Freedom: Genome-Wide Insights into Marronage (2021)",
          url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8229774/",
          tier: "referenced",
          notes:
            "Genomic study of the Angolar community, which discusses the shipwreck account and the Angolan origin of the ancestors.",
        },
        {
          title: "SIL Ethnologue — Angolar (aoa)",
          url: "https://www.ethnologue.com/language/aoa/",
          tier: "official",
        },
      ],
      provenance: "machine",
    },
    "crioulo-cap-vert": {
      headline:
        "In Cape Verde, a word that designated the slave born in the colony became the name of the nation.",
      body: [
        "The Portuguese crioulo first named the African slaves born in the colonies, then people of mixed descent. It was a category of status, produced by the system that named it.",
        "On the archipelago, it extended to the whole population and ceased to discriminate: it became the marker of an inclusive national identity, and the name of the language the country speaks. Few words have changed sides so completely.",
      ],
      entities: [
        { kind: "people", id: "PPL_CREOLE_CABOVERDIEN", label: "Cap-Verdiens" },
        { kind: "country", id: "CPV", label: "Cape Verde" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "SIL Ethnologue — Cape Verdean Creole (kea)",
          url: "https://www.ethnologue.com/language/kea/",
          tier: "official",
          notes:
            "Attests Kabuverdianu as the language of the archipelago and its names.",
        },
        {
          title: "JSTOR Daily — Cape Verde's Dilemma(s)",
          url: "https://daily.jstor.org/cape-verdes-dilemmas/",
          tier: "referenced",
          notes:
            "Revisits the political stakes of identity alignment at the time of independence.",
        },
      ],
      provenance: "machine",
    },
    // ————————————————————————————————————————————————————————————————————
    // The names a place gave
    // ————————————————————————————————————————————————————————————————————
    "kavango-riviere": {
      headline: "The vaKavango bear the name of the river that divides them.",
      body: [
        "The Okavango marks the natural border between Namibia and Angola in this region. The riverside people took its name, and the Namibian administrative region — split into Kavango East and Kavango West in 2013 — took theirs.",
        "The word has therefore gone round three times: from the water to the people, from the people to the province, and from the province to the civil status of those who live there. A border drawn by a river ends up naming the people on both banks.",
      ],
      entities: [
        { kind: "people", id: "PPL_KAVANGO", label: "vaKavango" },
        { kind: "country", id: "NAM", label: "Namibia" },
        { kind: "country", id: "AGO", label: "Angola" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "SIL Ethnologue — Kwangali (kwn)",
          url: "https://www.ethnologue.com/language/kwn/",
          tier: "official",
          notes:
            "Attests the language and the riverside location. The naming link between the river, the people and the region is reported by this people's entry in the atlas.",
        },
      ],
      provenance: "machine",
    },
    "kaonde-riviere": {
      headline:
        "The Kaonde were given their name by the chief who had just defeated them.",
      body: [
        "Tradition reports that the Lunda chief Musokantanda, after defeating chief Mushima, nicknamed him Mushima wa Kaonde — Mushima of the Kaonde river, a tributary of the Mukwizhi. The vanquished inherited the name of the watercourse where he stood.",
        "A folk etymology also pulls Kaonde towards “the thin one” or “the small number”, in reference to that same defeat. Two readings, a single direction: in both cases, the name is written by the victor.",
      ],
      entities: [
        { kind: "people", id: "PPL_KAONDE", label: "Kaonde" },
        { kind: "country", id: "ZMB", label: "Zambia" },
        {
          kind: "country",
          id: "COD",
          label: "Democratic Republic of the Congo",
        },
      ],
      tier: "unverified",
      sources: [
        {
          title: "Kaonde — DICE Database, University of Missouri",
          url: "https://dice.missouri.edu/assets/docs/niger-congo/Kaonde.pdf",
          tier: "referenced",
          notes:
            "Linguistic profile of Kaonde. The two origin accounts are traditional and reported by this people's entry in the atlas, with no source to arbitrate between them: hence the low reliability of the fact.",
        },
      ],
      provenance: "machine",
    },
    "manianga-marche": {
      headline:
        "The Manianga may be named after a market, or after a word let slip by Stanley.",
      body: [
        "Manianga was not an ethnonym. According to Van Bulck, it is the name of a market founded near Kimbanza by the ancestor Volumina, the only market in the region to survive into the colonial period. According to Monnier and Wiliame, it is a nickname thrown out by Stanley and his party in 1881 near the Mpioka falls, applied to a people that called itself Sundi.",
        "The two versions tell the same story: a word of circumstance, picked up by colonial writing, that became the name of a group. Ba-sundi remains the proper ethnic name — Ba- being the Bantu prefix for the human plural.",
      ],
      entities: [
        { kind: "people", id: "PPL_MANIANGA", label: "Manianga (Ba-sundi)" },
        {
          kind: "country",
          id: "COD",
          label: "Democratic Republic of the Congo",
        },
        { kind: "country", id: "COG", label: "Congo" },
      ],
      tier: "unverified",
      sources: [
        {
          title: "SIL Ethnologue — Kikongo (kon)",
          url: "https://www.ethnologue.com/language/kon",
          tier: "official",
          notes:
            "Attests the language and the Kongo affiliation. The two hypotheses on the origin of the name are reported by this people's entry in the atlas after Van Bulck on one side and Monnier and Wiliame on the other, without arbitration.",
        },
      ],
      provenance: "machine",
    },
    "gorowa-village-voisin": {
      headline:
        "The Gorwaa are designated by the name of their neighbours' largest village.",
      body: [
        "Kimbulu — or Mbulu — is borrowed from the main Iraqw village. The Swahili exonyms Fiome and Ufiomi circulate alongside, and the Datooga, neighbouring herders, call them Gobreik, a word that designates the old Cushitic farming groups from which Gorwaa and Iraqw descend.",
        "The matter is not historical. In town, many young Gorwaa call themselves Mbulu, and the label is gradually absorbing the two groups into one. A name borrowed from the neighbour ends up erasing the distinction it served to mark.",
      ],
      entities: [
        { kind: "people", id: "PPL_GOROWA", label: "Gorwaa" },
        { kind: "country", id: "TZA", label: "Tanzania" },
      ],
      tier: "referenced",
      sources: [
        {
          title:
            "Harvey, Andrew — Gorwaa (Tanzania), Language Documentation and Description",
          url: "https://www.lddjournal.org/article/1200/galley/2445/download/",
          tier: "referenced",
          notes:
            "Field documentation that records the competing names and the urban drift towards Mbulu.",
        },
        {
          title: "SIL Ethnologue — Gorwaa (gow)",
          url: "https://www.ethnologue.com/language/gow/",
          tier: "official",
        },
      ],
      provenance: "machine",
    },
    "kalabari-calabar": {
      headline:
        "Kalabari and Calabar sound alike and have nothing in common: the Europeans confused the two.",
      body: [
        "Kalabari comes from an eponymous ancestor, Perebo Kalabari, son of Meinowei. Calabar is an Efik name, that of a town on the Cross River. The Portuguese, arriving on the coast, wrote Calabari under the influence of the neighbourhood; the British pronounced Calabar. Two unrelated place names merged in the newcomers' ear.",
        "The people, for its part, calls itself Awome. And the name of the main settlement, Elem Kalabari, says “new shipping port” — that is, what trade had made of it.",
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
            "The reference history of the Niger Delta, and the source of the distinction between Kalabari and Calabar.",
        },
        {
          title: "SIL Ethnologue — Kalabari (ijn)",
          url: "https://www.ethnologue.com/language/ijn/",
          tier: "official",
        },
      ],
      provenance: "machine",
    },
    // ————————————————————————————————————————————————————————————————————
    // The names scholars gave
    // ————————————————————————————————————————————————————————————————————
    "omotique-fleuve-omo": {
      headline:
        "A language family of Ethiopia was renamed in 1969 after a river, to stop saying “West Cushitic”.",
      body: [
        "Until Greenberg, in 1963, these languages of south-western Ethiopia are classed as a western branch of Cushitic. Harold C. Fleming proposes in 1969 to treat them as an independent branch of Afro-Asiatic, and to call them Omotic — after the Omo, the river on whose banks most of these peoples live. Bender's work, in 1971, wins acceptance for the proposal.",
        "The word designates no shared identity: Bench, Dizi, Kafa, Wolaita, Gamo, Hamer do not think of themselves as Omotic. And the unity of the family is disputed — for some linguists, the Mao and South Omotic languages do not even belong to Afro-Asiatic. A scholarly category can be renamed once and remain debated for half a century.",
      ],
      entities: [
        {
          kind: "people",
          id: "PPL_OMOTIQUE_MACRO",
          label: "Peuples omotiques",
        },
        { kind: "family", id: "FLG_OMOTIQUE", label: "Omotic languages" },
        { kind: "country", id: "ETH", label: "Ethiopia" },
      ],
      tier: "referenced",
      sources: [
        {
          title:
            "Bender, M. Lionel — Omotic: A New Afroasiatic Language Family. Southern Illinois University, 1975",
          tier: "referenced",
          notes:
            "The work that establishes the Omotic family as an independent branch, after Fleming's proposal.",
        },
        {
          title:
            "The Cambridge Handbook of Linguistic Typology — The Omotic Language Family",
          url: "https://www.cambridge.org/core/books/cambridge-handbook-of-linguistic-typology/omotic-language-family/376C86AD112F0E4C5F5677AE4F3DB5FA",
          tier: "referenced",
          notes:
            "State of the question, including the challenges to the internal unity of the family.",
        },
      ],
      provenance: "machine",
    },
    "gur-mabia": {
      headline:
        "The Gur languages have changed name three times, and the latest proposal comes from within.",
      body: [
        "Koelle files them in 1854 under his “North-Eastern High Sudan”. They then become the Voltaic languages, after the Volta river, then Gur. None of these names comes from the peoples concerned: they have, moreover, no sense of shared belonging, the family being a linguists' category.",
        "In 2017, the linguist Adams Bodomo proposes Mabia for the whole of Central Gur: from Proto-Gur ma-, mother, and bia, child. The name says a kinship instead of saying a river, and it is proposed by someone whose language it is. That is rare enough to be noted.",
      ],
      entities: [
        { kind: "people", id: "PPL_GUR_MACRO", label: "Peuples gur" },
        { kind: "family", id: "FLG_GUR", label: "Gur languages" },
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
            "The proposal to rename Central Gur as Mabia, and the etymological argument ma- + bia.",
        },
        {
          title:
            "Kleinewillinghöfer, Ulrich — Gur-Adamawa relationship, Journal of West African Languages, 2014",
          tier: "referenced",
          notes:
            "Situates the Gur family and the fragility of its outlines, on which the name depends.",
        },
      ],
      provenance: "machine",
    },
    "ronga-junod": {
      headline:
        "The ethnonym Ronga was put into circulation by a Swiss philologist.",
      body: [
        "Henri-Alexandre Junod, missionary and linguist, is the first to study the language at the end of the nineteenth century, and it is his usage that fixes the term in European literature. The word was not invented: sixteenth-century Portuguese sources already mentioned Rhonga chiefdoms around Delagoa Bay, present-day Maputo Bay.",
        "What the scholar fixes, he also fixes against something else. Mozambican and South African censuses subsequently filed the Ronga under Tsonga or under Shangaan, and the question of whether Xironga is a language or a dialect of Xitsonga is still not closed.",
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
            "The ethnography that establishes the vocabulary the later literature inherits.",
        },
        {
          title: "SIL Ethnologue — Ronga (rng)",
          url: "https://www.ethnologue.com/language/rng/",
          tier: "official",
          notes: "Attests Xironga as a language and its neighbouring names.",
        },
      ],
      provenance: "machine",
    },
    // ————————————————————————————————————————————————————————————————————
    // The names refracted by the languages of Europe
    // ————————————————————————————————————————————————————————————————————
    "fulbe-quatre-noms": {
      headline:
        "The Fulbe bear four international names, and none of the four is their own.",
      body: [
        "Peul comes from the Wolof Pel, taken up by the French colonisers. Fula is the anglicisation of a Mandingo term. Fulani is the Hausa form, now common in Nigeria and throughout the English-speaking world. Fellata is the Arabic term of Sudan and Chad, applied to those settled along the pilgrimage routes — and it is loaded with stereotypes negative enough to be avoided.",
        "The people's name, in Fula, is Fulbe in the plural and Pullo in the singular. Four neighbouring languages each manufactured its own label, and it is those four that travelled.",
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
            "Attests the names Peul, Fula, Fulani and Fulbe for the same language.",
        },
        {
          title:
            "Seydou, Christiane — La poésie pastorale peule. Karthala, 1977",
          tier: "referenced",
          notes:
            "Reference work on the Fula language and oral tradition, and on what the people names itself.",
        },
      ],
      provenance: "machine",
    },
    "malinke-manden": {
      headline:
        "Malinké, Mandinka, Mandingo, Maninka: a single name, refracted by the routes of dispersal.",
      body: [
        "All come from the Manden, the historical region that was the cradle of the Mali empire. Malinké is its French form, Maninka that of Guinea and Mali, Mandinka that of Senegal, the Gambia and Guinea-Bissau, Mandingo the colonial English version still used in the Gambia and Sierra Leone.",
        "Each form marks a route of dispersal and the administration that wrote it down. Around fifteen million people are concerned, and ISO 639-3 ended up cutting the whole into half a dozen separate languages — because a name that is said six ways ends up being classified six times.",
      ],
      entities: [
        { kind: "people", id: "PPL_MALINKE", label: "Malinké" },
        { kind: "country", id: "MLI", label: "Mali" },
        { kind: "country", id: "GIN", label: "Guinea" },
        { kind: "country", id: "SEN", label: "Senegal" },
        { kind: "country", id: "GMB", label: "The Gambia" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "SIL Ethnologue — macrolangue mandingue (man)",
          url: "https://www.ethnologue.com/language/man/",
          tier: "official",
          notes:
            "Attests the competing forms and the split into distinct languages by ISO 639-3.",
        },
      ],
      provenance: "machine",
    },
    "fang-reputation": {
      headline:
        "The Fang let a reputation as cannibals run in order to keep strangers at a distance.",
      body: [
        "Pahouin is the French label, Pangwe the German, Pamue the Spanish: three empires, three spellings, a single people, which calls itself Fang. The term Pahouin is now held to be pejorative.",
        "It is so notably because it became loaded with a reputation as cannibal warriors — which the Fang, this people's entry reports, cultivated themselves to deter visitors. A people can therefore contribute to its own black legend, and then discover that it outlives it and does it harm.",
      ],
      entities: [
        { kind: "people", id: "PPL_FANG_GABON", label: "Fang" },
        { kind: "country", id: "GAB", label: "Gabon" },
        { kind: "country", id: "GNQ", label: "Equatorial Guinea" },
        { kind: "country", id: "CMR", label: "Cameroon" },
      ],
      tier: "unverified",
      sources: [
        {
          title: "SIL Ethnologue — Fang (fan)",
          url: "https://www.ethnologue.com/language/fan/",
          tier: "official",
          notes: "Attests the ethnonym and the competing colonial labels.",
        },
        {
          title: "Smarthistory — Fang reliquary guardian figure",
          url: "https://smarthistory.org/fang-reliquary-figure/",
          tier: "referenced",
          notes:
            "Context on the Fang and their art. The deliberate cultivation of the reputation is reported by this people's entry in the atlas with no dedicated source, hence the low reliability of the fact.",
        },
      ],
      provenance: "machine",
    },
    "beti-cranes": {
      headline:
        "The accusation of cannibalism levelled at the Beti rested on ancestors' skulls.",
      body: [
        "Paul Du Chaillu, in 1856, observes skulls near the villages and concludes that they are anthropophagous. They were ancestors' skulls, kept as such. The misreading was taken up, printed, and served to justify colonial violence.",
        "The word that carried it is Pahouin, the French deformation of the German Pangwe, an administrative label that lumped Ewondo, Bulu, Fang, Eton and Bane together under a single name. A false category and a false slander travelled together, and each made the other easier to believe.",
      ],
      entities: [
        { kind: "people", id: "PPL_BETI", label: "Béti" },
        { kind: "country", id: "CMR", label: "Cameroon" },
        { kind: "country", id: "GNQ", label: "Equatorial Guinea" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "SIL Ethnologue — Ewondo (ewo)",
          url: "https://www.ethnologue.com/language/ewo/",
          tier: "official",
          notes:
            "Attests one of the languages gathered under the Beti-Pahouin label.",
        },
        {
          title: "SIL Ethnologue — Fang (fan)",
          url: "https://www.ethnologue.com/language/fan/",
          tier: "official",
          notes:
            "Attests the other. The Du Chaillu episode and the nature of the skulls are reported by this people's entry in the atlas.",
        },
      ],
      provenance: "machine",
    },
    // ————————————————————————————————————————————————————————————————————
    // The names their bearers have reclaimed
    // ————————————————————————————————————————————————————————————————————
    "khwe-penduka": {
      headline:
        "In 2000, at Penduka, peoples gathered to decide how their name is spelt.",
      body: [
        "The Khwe of the Kalahari and the Okavango were named Kxoe, Hukwe, Xun, Barakwena, Mbarakwena depending on the source — and “Water Bushmen” in colonial documents, on account of their riverside habitat. Several of these forms are derogatory; the word Bushmen is now widely rejected.",
        "The Penduka declaration, in 2000, recommends a standardised spelling: Khwe. It is the reverse gesture to everything else on this page — not a name received, but a name settled by those who bear it, on a date one can cite.",
      ],
      entities: [
        { kind: "people", id: "PPL_KXOE", label: "Khwe" },
        { kind: "country", id: "BWA", label: "Botswana" },
        { kind: "country", id: "NAM", label: "Namibia" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "Glottolog — Kxoe (kxoe1243, ISO 639-3 : xuu)",
          url: "https://glottolog.org/resource/languoid/id/kxoe1243",
          tier: "official",
          notes: "Attests the language and the competing names.",
        },
        {
          title:
            "Kilian-Hatz, Christa — Khwe Dictionary. Rüdiger Köppe Verlag, 2003",
          tier: "referenced",
          notes:
            "The reference dictionary, published under the spelling recommended by the Penduka declaration.",
        },
      ],
      provenance: "machine",
    },
    "west-taa-masarwa": {
      headline:
        "The !Xoon call themselves “the people of the west”, and their neighbours call them Masarwa.",
      body: [
        "ǃama ʘʔâni, in Taa, says the direction: the people of the west. Masarwa is the Tswana word, generally held to be pejorative; Magong is a regional variant of it. The label West Taa, for its part, came from linguists, to distinguish this variety from the eastern !Xoon documented by Anthony Traill.",
        "Three registers are therefore layered over the same people: what they call themselves, what the neighbour says of them, what science records. None of the three translates into the other two, and it is the third that appears in the catalogues.",
      ],
      entities: [
        { kind: "people", id: "PPL_WEST_TAA", label: "!Xoon occidental" },
        { kind: "country", id: "BWA", label: "Botswana" },
        { kind: "country", id: "NAM", label: "Namibia" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "SIL Ethnologue — Taa (nmn)",
          url: "https://www.ethnologue.com/language/nmn/",
          tier: "official",
          notes:
            "Attests the language, the autonym !Xoon and the exonym Masarwa.",
        },
        {
          title: "Glottolog — West !Xoon (xooo1239)",
          url: "https://glottolog.org/resource/languoid/id/xooo1239",
          tier: "official",
        },
      ],
      provenance: "machine",
    },
    "antambahoaka-surnom": {
      headline:
        "The Antambahoaka of Madagascar bear the deformation of a nickname: “beloved of his people”.",
      body: [
        "Ratiambahoaka was the nickname of the founder Ravalarivo. The group that formed around him took the word, worn down by usage, as its collective name.",
        "Internally, another name circulates: Zafiraminia, “sons of Raminia”, reserved for members initiated after circumcision — the sambatra. A people can thus bear two names that do not address the same audience.",
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
            "Attests the macrolanguage and its varieties. The etymology of the name is a tradition reported by this people's entry in the atlas, with no source attesting it: hence the low reliability of the fact.",
        },
      ],
      provenance: "machine",
    },
    "masa-banana": {
      headline:
        "Not every name given by neighbours wounds: “Banana” means friendly.",
      body: [
        "It is the exonym of the Masa in several neighbouring languages, and it comes from their reputation for hospitality. Yagoua, another common name, is simply the name of their main town in Cameroon.",
        "The contrast makes the rest legible. The same Masa are also called Kirdi — “pagan” —, a word they reject. A people receives names from several neighbours at once, and it is the balance of power, not the language, that decides which one gets printed.",
      ],
      entities: [
        { kind: "people", id: "PPL_MASA", label: "Masa" },
        { kind: "country", id: "TCD", label: "Chad" },
        { kind: "country", id: "CMR", label: "Cameroon" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "SIL Ethnologue — Masana (mcn)",
          url: "https://www.ethnologue.com/language/mcn/",
          tier: "official",
          notes:
            "Attests the endonym Masana and the names Massa, Banana and Yagoua.",
        },
      ],
      provenance: "machine",
    },
    "rendille-baton": {
      headline:
        "The Rendille call themselves “bearers of God's staff”. The Somali call them “those who refused”.",
      body: [
        "The ethnonym Rendille is translated by a reference to a sacred chief's staff. The Somali word Rertit — Reer Til, the rejected — says something else entirely: those who refused Somali territory and stayed at Marsabit.",
        "The Somali push the distinction further still, separating the “true” Rendille, called asil, from those who speak Samburu and are held to be assimilated. Naming one's neighbour, here, amounts to ruling on what he should have been.",
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
          notes: "Attests the language and the neighbouring names.",
        },
        {
          title:
            "Schlee, Günther — Identities on the Move: Clanship and Pastoralism in Northern Kenya. Manchester University Press, 1989",
          tier: "referenced",
          notes:
            "The reference study on identities and clan affiliations in northern Kenya.",
        },
      ],
      provenance: "machine",
    },
    // ————————————————————————————————————————————————————————————————————
    // The names whose famous etymology does not hold
    // ————————————————————————————————————————————————————————————————————
    "kaffa-cafe": {
      headline:
        "No, the word “coffee” probably does not come from the kingdom of Kaffa.",
      body: [
        "The hypothesis is too neat not to circulate: the coffee plant grows in this region of Ethiopia, the kingdom is called Kaffa, so the word must come from it. Linguists judge it unlikely, and the literature reports it as a hypothesis, not as a fact.",
        "What Kaffa really names is already threefold: a people — which calls itself Kafficho —, a historical kingdom, and a present-day Ethiopian administrative zone. Keffa is its Amharic transliteration. Three things under one word are enough; the fourth was one too many.",
      ],
      entities: [
        { kind: "people", id: "PPL_KAFA", label: "Kafficho" },
        { kind: "country", id: "ETH", label: "Ethiopia" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "Glottolog — Kafa (kafa1242)",
          url: "https://glottolog.org/resource/languoid/id/kafa1242",
          tier: "official",
          notes:
            "Attests the language and the autonym. The unlikelihood of the etymology of the word coffee is reported by this people's entry in the atlas after the linguistic literature.",
        },
        {
          title: "Pankhurst, Richard — The Ethiopian Borderlands, 1997",
          tier: "referenced",
          notes:
            "History of the Ethiopian marches, including the kingdom of Kaffa and its incorporation.",
        },
      ],
      provenance: "machine",
    },
    "bono-brong-ahafo": {
      headline:
        "An exonym became, in 1959, the official name of a region of Ghana.",
      body: [
        "The Bono call themselves Bono, or Bonofoɔ — “the pioneers”, “the first-born of the land”. Brong is the form the Asante and the Gonja used to designate the peoples of the zone between the Asante and the Volta, and which the British administrators took up. In Côte d'Ivoire, the same population is called Abron.",
        "In 1959, the exonym enters official geography with the Brong-Ahafo region, which lumps together peoples of different origins. The country has since split it into Bono, Bono East and Ahafo: it took sixty years for the name the people gives itself to return to the map.",
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
          notes:
            "Attests the forms Bono, Brong and Abron for the same language.",
        },
        {
          title:
            "Stahl, Ann Brower — Making History in Banda: Anthropological Visions of Africa's Past. Cambridge University Press, 2001",
          tier: "referenced",
          notes:
            "Archaeology and history of the zone, and of what the regional divisions covered over there.",
        },
      ],
      provenance: "machine",
    },
    "toura-wen": {
      headline:
        "Among the Toura, the colonial name stayed official and the proper name stayed domestic.",
      body: [
        "Toura is the form adopted by the French colonial administration; it remains in official use in Côte d'Ivoire, and Tura is its English-language variant. Wen, or Wenmebo, is the endonym.",
        "The division is clean and it is commonplace: one of the two names appears on the papers, the other is spoken at home. The dozen other names recorded — Gwane, Nebou, Yaramassa — are names of subgroups that the single name erased.",
      ],
      entities: [
        { kind: "people", id: "PPL_TOURA", label: "Toura (Wen)" },
        { kind: "country", id: "CIV", label: "Côte d'Ivoire" },
        { kind: "country", id: "GIN", label: "Guinea" },
      ],
      tier: "referenced",
      sources: [
        {
          title: "Glottolog — Dan-Toura (dant1235)",
          url: "https://glottolog.org/resource/languoid/id/dant1235",
          tier: "official",
          notes:
            "Attests the affiliation of the language and the competing names.",
        },
      ],
      provenance: "machine",
    },
  };
