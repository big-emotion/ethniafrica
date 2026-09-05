/**
 * The English alt texts of the anecdote illustrations — the sidecar of
 * `didYouKnowIllustrations.ts`.
 *
 * A sidecar carries the leaves it translates and nothing else, so an entry
 * here is only what an English reader hears or reads on the plate: the alt,
 * and the half-line that says who gave the name. Everything else on an
 * illustration is invariant — the file path, the credit line a licence
 * requires verbatim, the two names on a plate, the licence and file URLs —
 * and lives once, in the French module.
 *
 * Every entry is an agent-produced translation and says so (`provenance:
 * "machine"`, DEC-048). Nothing here is wired into a component yet; the
 * bilingual foundation PR mounts it.
 */

import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";

// @req REQ-145
export type DidYouKnowIllustrationTranslation =
  | { kind: "picture"; alt: string; provenance: TranslationKind }
  | {
      kind: "plate";
      alt: string;
      givenBy: string;
      provenance: TranslationKind;
    };

/** The plate's alt reads the same way for every anecdote; only the two names change. */
function plate(
  given: string,
  own: string,
  givenBy: string
): DidYouKnowIllustrationTranslation {
  return {
    kind: "plate",
    givenBy,
    alt: `Onomastic plate: “${given}”, the name received, above the name “${own}” this people gives itself.`,
    provenance: "machine",
  };
}

function picture(alt: string): DidYouKnowIllustrationTranslation {
  return { kind: "picture", alt, provenance: "machine" };
}

// @req REQ-145
export const DID_YOU_KNOW_ILLUSTRATIONS_EN: Record<
  string,
  DidYouKnowIllustrationTranslation
> = {
  monrovia: picture(
    "Hand-drawn map of Liberia made around 1870, annotated in ink to add place names."
  ),
  bantou: picture(
    "Map of Guthrie's Bantu zones: the linguistic area carved into letters and numbers."
  ),
  "cote-ivoire": picture(
    "Elephant tusk carved with figures along its whole length."
  ),
  amazigh: picture("Tifinagh inscriptions carved into rock, in Algeria."),
  lingala: picture(
    "The paddle steamer “Livingstone” moored at Baringa, in the Congo basin, between 1900 and 1915."
  ),
  "personne-relationnelle": picture(
    "Annual assembly of the men of the village of Ribina, seated in front of their huts, in Nigeria."
  ),
  afrique: picture("Ruins of the Baths of Antoninus at Carthage, in Tunisia."),
  "burkina-faso": picture(
    "Aerial view of Ouagadougou photographed from an aeroplane in the winter of 1930–1931."
  ),
  cameroun: picture(
    "Dugout canoes lined up on the waters of the Wouri, at Douala."
  ),
  "benin-dahomey": picture(
    "Cast brass plaque from the Kingdom of Benin, sixteenth century, held at the British Museum."
  ),
  "nigeria-flora-shaw": picture(
    "Flora Shaw and Frederick Lugard photographed together in 1908."
  ),
  "zimbabwe-grand-zimbabwe": picture(
    "Outer dry-stone walls of Great Zimbabwe."
  ),
  "prefixes-bantous": picture(
    "Village clinging to the Maloti mountains, in Lesotho."
  ),
  "peul-dix-noms": picture(
    "In front of a railway station in Dakar, a man wearing the pointed Fula straw hat."
  ),
  "khoikhoi-hottentot": picture(
    "French engraving of 1797 entitled “Hottentote”, a plate from a collection of costumes of the world."
  ),
  "pygmee-homere": picture(
    "Greek red-figure vase modelled in the shape of a pygmy carrying a slain crane."
  ),
  "lac-lac": picture(
    "Map of Africa drawn by Victor Levasseur around 1847, framed with engraved vignettes."
  ),
  tombouctou: picture(
    "The Djingareyber mosque of Timbuktu, in mud brick, bristling with supporting beams."
  ),
  "fleuve-niger": picture(
    "Boatmen steering a laden pinnace on the Niger river."
  ),
  ethiopie: picture(
    "Illuminated page from an Ethiopian gospel on parchment, fourteenth to fifteenth century."
  ),
  guinee: picture(
    "Wall map of Africa published by Boulton in 1794 after d'Anville."
  ),
  tanzanie: picture("Portrait of Julius Nyerere photographed in 1975."),
  mozambique: picture(
    "The church of São Sebastião, inside the fort of the same name, on the Island of Mozambique."
  ),
  "sierra-leone": picture(
    "Nautical chart of Freetown bay engraved for an 1884 sailing guide."
  ),
  "iteso-bakedi": plate(
    "Bakedi",
    "Iteso",
    "given by the Baganda, nineteenth century"
  ),
  "datoga-mangati": plate(
    "Mang'ati",
    "Datooga",
    "from the Maasai — “the enemies”"
  ),
  "azande-niamniam": picture(
    "Red and yellow flowers of Impatiens niamniamensis, grown under glass at the Berlin botanical garden."
  ),
  "wonnin-godie": plate(
    "Godié",
    "Wonnin",
    "from the Neyo gwèdji — “chimpanzee-panther”"
  ),
  "murle-moden": plate(
    "Beir · Jebe · Ajibba",
    "Murle",
    "from the Dinka, the Luo and the Anuak"
  ),
  "kirdi-paien": plate(
    "Kirdi",
    "Mafa · Massa · Podoko",
    "from Kanuri-Hausa — “pagan”"
  ),
  "bambara-refus": picture(
    "Bamana chi wara dance crest, in openwork wood, depicting an antelope with raised horns."
  ),
  "dogon-habe": plate("Habe", "Dogon", "Fula exonym — “stranger”"),
  "le-nom-est-une-reponse": plate(
    "Frafra",
    "Nankana",
    "from a greeting: ya fara fara?"
  ),
  "guere-wobe": picture(
    "Wè ritual mask from Côte d'Ivoire, with a protruding face ringed with fibres."
  ),
  "bamileke-cent-royaumes": plate(
    "Bamiléké",
    "Bandjoun · Bafoussam · Dschang",
    "from the German administration, from 1884"
  ),
  "sara-douzaine": plate(
    "Sara",
    "Ngambay · Sar · Mbay",
    "from outside observers, then from France"
  ),
  "bete-plantation": plate("Bété", "Magwé", "French administrative category"),
  "bassa-nge-distinction": plate(
    "Bassa",
    "Bassa Nge",
    "distinction added by the British"
  ),
  "tswa-recensement": plate(
    "Tsonga · Shangaan",
    "Vatswa",
    "from the censuses, since the Portuguese era"
  ),
  "hutu-cartes-identite": plate(
    "Hutu",
    "Abahutu",
    "fixed by the Belgian identity cards, 1920"
  ),
  "kasem-gurunsi": plate(
    "Gurunsi",
    "Kasena",
    "from Zarma — “iron does not penetrate”"
  ),
  "dioula-metier": picture(
    "The Grand Mosque of Bobo-Dioulasso, built in mud brick and bristling with supporting beams."
  ),
  "teke-vendre": plate(
    "Teke-Tege",
    "BaTeke",
    "a division of the linguistic catalogues"
  ),
  "tetela-watetera": plate(
    "Watetera",
    "Motetela",
    "Arabic slave-trade term, taken up in 1885"
  ),
  "tabwa-attache": picture(
    "Tabwa male figure in carved wood, the torso covered in chevron scarifications."
  ),
  "angolar-naufrage": plate(
    "Angolares",
    "N'golá",
    "from Portuguese, after Angola"
  ),
  "crioulo-cap-vert": plate(
    "Crioulo",
    "Kabuverdianu",
    "from Portuguese — the slave born in the colony"
  ),
  "kavango-riviere": plate(
    "Okavango people",
    "vaKavango",
    "after the border river"
  ),
  "kaonde-riviere": plate(
    "Mushima wa Kaonde",
    "BaKaonde",
    "given by the Lunda victor"
  ),
  "manianga-marche": plate(
    "Manianga",
    "Ba-sundi",
    "from a market — or from Stanley, 1881"
  ),
  "gorowa-village-voisin": plate(
    "Kimbulu · Fiome",
    "Gorwaa",
    "from Swahili, and from the neighbouring Iraqw village"
  ),
  "kalabari-calabar": plate(
    "New Calabar",
    "Awome",
    "from Portuguese navigators, then British ones"
  ),
  "omotique-fleuve-omo": picture(
    "The lower Omo valley, in south-western Ethiopia, under a heavy sky."
  ),
  "gur-mabia": picture(
    "Trees reflected on the surface of the Volta, in Ghana."
  ),
  "ronga-junod": picture(
    "Map of the Tsonga groups and their location, drawn by Henri-Alexandre Junod for his study."
  ),
  "fulbe-quatre-noms": plate(
    "Peul · Fula · Fulani · Fellata",
    "Fulbe",
    "from Wolof, Mandingo, Hausa and Arabic"
  ),
  "malinke-manden": plate(
    "Mandingo · Mandinka",
    "Maninka",
    "from the colonial administrations"
  ),
  "fang-reputation": picture(
    "Eyema byeri reliquary guardian, a Fang sculpture from Gabon, with metal-inlaid eyes."
  ),
  "beti-cranes": picture(
    "Bust-length photographic portrait of the explorer Paul Belloni Du Chaillu."
  ),
  "khwe-penduka": plate(
    "Barakwena · Water Bushmen",
    "Khwe",
    "from Bantu neighbours, and from the administration"
  ),
  "west-taa-masarwa": plate(
    "Masarwa",
    "!Xoon",
    "Tswana exonym, held to be pejorative"
  ),
  "antambahoaka-surnom": plate(
    "Ratiambahoaka",
    "Antambahoaka",
    "the founder's nickname — “beloved of his people”"
  ),
  "masa-banana": plate("Banana", "Masana", "from neighbours — “friendly”"),
  "rendille-baton": plate(
    "Rertit",
    "Rendille",
    "from Somali — “those who refused”"
  ),
  "kaffa-cafe": plate("Keffa", "Kafficho", "Amharic transliteration"),
  "bono-brong-ahafo": plate(
    "Brong · Abron",
    "Bonofoɔ",
    "from the Asante, then the British"
  ),
  "toura-wen": plate(
    "Toura",
    "Wenmebo",
    "from the French colonial administration"
  ),
};
