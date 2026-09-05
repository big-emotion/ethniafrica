/**
 * The English prose of the glossary, keyed by the French entry's id.
 *
 * A sidecar rather than three more fields on GlossaryEntry, because the
 * French module is the one every surface imports and its shape is under
 * concurrent change; the wiring that reads this beside it comes with the
 * bilingual foundation. The English *term* already lives in entries.ts —
 * REQ-144 wanted one bilingual glossary from the first line — so only the
 * definition, the corpus example and the absence reason are carried here.
 *
 * Every entry is agent-produced (DEC-048) and says so: the reader is owed the
 * provenance of a translation as much as the tier of a source. A glossary is
 * prose whose subject is a word, which REQ-143 does not publish at machine
 * provenance — so the wiring that mounts this record owes a human review
 * before an English definition reaches a reader; the label here is what
 * makes that gate enforceable. Names cited from the corpus stay as the
 * French writes them; a translation that renamed Jieng would repeat the very
 * act the entry documents.
 */

import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";

export interface GlossaryDefinitionEn {
  definition: string;
  corpusExample?: string;
  absenceReason?: string;
  provenance: Extract<TranslationKind, "machine">;
}

// @req REQ-145
export const GLOSSARY_DEFINITIONS_EN: Readonly<
  Record<string, GlossaryDefinitionEn>
> = {
  // ── Where the name comes from ───────────────────────────────────────────
  autonyme: {
    definition:
      "The name a group gives itself and claims. Every autonym is an endonym; the reverse is not guaranteed — a name can circulate on the inside without anyone being attached to it.",
    corpusExample:
      "Jieng, preferred by those concerned where international usage says Dinka.",
    provenance: "machine",
  },
  "emique-etique": {
    definition:
      "Emic: describing with the categories of those concerned. Etic: describing with those of the observer. The atlas carries the emic and flags the etic when it cannot do otherwise.",
    corpusExample:
      "A people filed under a language family devised in 1862 is described etically, and the record says so.",
    provenance: "machine",
  },
  endonyme: {
    definition:
      "The name of a group in its own language. The corpus declares 798 of them for 800 records — and 3,201 names that came from outside.",
    corpusExample: "Ovaherero, “the owners of cattle” in Otjiherero.",
    provenance: "machine",
  },
  "etymologie-populaire": {
    definition:
      "An origin explained by sound resemblance, passed on, and false. It circulates all the better for being pretty — the risk peculiar to a dossier on names.",
    corpusExample:
      "The line from Kaffa to “coffee” is seductive and disputed; the line from qahwa to kahve is not.",
    provenance: "machine",
  },
  exonyme: {
    definition:
      "The name given to a group from outside — a neighbour, a merchant, an administration. Neither necessarily hostile nor necessarily colonial.",
    corpusExample:
      "3,201 exonyms in the corpus; 120 records attribute theirs to neighbours, 75 to Arabic.",
    provenance: "machine",
  },
  "exonyme-depreciatif": {
    definition:
      "An exonym whose very form belittles: a mockery, an insult, a nickname turned official. 87 records report one.",
    corpusExample:
      "“Hottentot”, coined by Dutch settlers imitating the click consonants of Khoekhoe.",
    provenance: "machine",
  },
  "graphie-historique": {
    definition:
      "A spelling attested at one period, kept so that older sources remain findable. It is neither an endonym nor an exonym: it is a trace of writing.",
    corpusExample: "“Denka” for Dinka, in the colonial literature.",
    provenance: "machine",
  },
  onomastique: {
    definition:
      "The science of proper names — who names, when, and under what authority. It is the reading axis of this atlas more than a discipline the atlas practises.",
    corpusExample:
      "The five chapters of this dossier are five onomastic regimes.",
    provenance: "machine",
  },

  // ── What is named ───────────────────────────────────────────────────────
  anthroponyme: {
    definition:
      "The name of a person, all systems taken together — given name, clan name, praise name, name of attribution. The generic term that “patronym” wrongly claims to cover.",
    corpusExample: "The thirty name records of the corpus.",
    provenance: "machine",
  },
  "chaine-patronymique": {
    definition:
      "A system in which one is named by stringing together one’s ascendants: the father’s given name becomes the child’s second name, and nothing is fixed from one generation to the next.",
    corpusExample:
      "Four records declare a non-hereditary transmission of this kind.",
    provenance: "machine",
  },
  choronyme: {
    definition:
      "The name of a region or a territory, as opposed to a point on a map.",
    corpusExample:
      "Bilād as-sūdān, “the land of the Blacks”, used by the Arab geographers, became Sudan.",
    provenance: "machine",
  },
  ethnonyme: {
    definition:
      "The name of a people. It is the central object of the atlas, and the most disputed: 460 records declare theirs contested or inherited from colonisation.",
    corpusExample: "Dinka and Jieng designate the same people, from two sides.",
    provenance: "machine",
  },
  glossonyme: {
    definition:
      "The name of a language. A glossonym is not the name of a people, and a language family describes no population.",
    corpusExample:
      "The corpus files 800 peoples under 24 families; the largest bears a word coined in 1862.",
    provenance: "machine",
  },
  hydronyme: {
    definition: "The name of a watercourse or a body of water.",
    corpusExample:
      "The river Niger gave its name to two countries, and Lake Chad to a third.",
    provenance: "machine",
  },
  jamu: {
    definition:
      "Mande clan name. Neither a patronym nor a family name: a belonging, transmitted but also granted — by alliance, by clientship, by captivity.",
    corpusExample: "Eighteen records of the corpus declare a clan name.",
    provenance: "machine",
  },
  nisba: {
    definition:
      "Arab-Berber name of attribution, formed on a place, a group of origin or a trade. The literature says “tribe” where the atlas writes “group” — the rule holds for the Arab world as for the rest.",
    corpusExample: "Two records of the corpus declare this system.",
    provenance: "machine",
  },
  "nom-totemique": {
    definition:
      "Clan name attached to an animal or a plant, often with a food prohibition and a closed list of permitted given names.",
    corpusExample: "Four records of the corpus declare this system.",
    provenance: "machine",
  },
  oriki: {
    definition:
      "Yoruba praise name: a sequence that tells the lineage, its great deeds and its attributes. It is recited rather than written down.",
    corpusExample: "Two records of the corpus declare a praise name.",
    provenance: "machine",
  },
  oronyme: {
    definition: "The name of a relief feature — mountain, massif, escarpment.",
    corpusExample:
      "Kirinyaga, “the mountain of whiteness” in Kikuyu, gave Kenya its name.",
    provenance: "machine",
  },
  "patronyme-matronyme": {
    definition:
      "A name taken from the father, or from the mother. Neither is universal: of thirty records, thirteen declare a patrilineal transmission, thirteen another route, four none.",
    corpusExample:
      "The hereditary family name is one way of doing things among others, not the rule.",
    provenance: "machine",
  },
  postnom: {
    definition:
      "A name borne after the given name, instituted in the Republic of Zaire on 12 January 1972 in place of Christian given names, and kept after the fall of the regime that decreed it.",
    absenceReason:
      "No name record in the corpus declares the postname as a system. The term is defined because the chapter uses it, not because the atlas instantiates it.",
    provenance: "machine",
  },
  theonyme: {
    definition: "The name of a deity.",
    corpusExample:
      "Mami Wata: a late collective name, laid over ancient and multiple water deities.",
    absenceReason:
      "The atlas keeps no records on deities. The term is defined because the chapter “The thing” needs it.",
    provenance: "machine",
  },
  toponyme: {
    definition:
      "The name of a place, at every scale. The map flattens them all into “country name”, and it is this flattening that leads one to believe a country and a people coincide.",
    corpusExample:
      "All 54 country records give their etymology, and none sources it.",
    provenance: "machine",
  },

  // ── What naming produces ────────────────────────────────────────────────
  "asymetrie-documentaire": {
    definition:
      "The gap between what has been written about a group and what it has written about itself. It measures archives, never peoples.",
    corpusExample:
      "3,201 exonyms for 798 autonyms — and 321 records out of 800 that declare no status.",
    provenance: "machine",
  },
  "fixation-patronymique": {
    definition:
      "The moment a name ceases to be a way of designating and becomes a hereditary register entry — by the sole fact of having been written down.",
    corpusExample:
      "The colonial civil registry demanded a name of European form; where none existed, the clerk wrote one in.",
    provenance: "machine",
  },
  indigenisation: {
    definition:
      "The appropriation by which an object from elsewhere becomes a thing from here — often changing its name, never its origin.",
    corpusExample:
      "Wax print is made in the Netherlands and named by the West African women who buy it.",
    provenance: "machine",
  },
  "palier-de-source": {
    definition:
      "The degree of authority attached to a citation: Official, Referenced, Unverified — plus “Awaiting review” when no one has yet ruled. Nothing is set aside; everything is labelled.",
    corpusExample:
      "Every source in this dossier carries its own, including those still awaiting their primary source.",
    provenance: "machine",
  },
  "reification-ethnique": {
    definition:
      "The passage from a classifying category to a thing that exists: what was a way of speaking becomes a population, with a figure and a border.",
    corpusExample:
      "The drift of “Bantu”: a language family, then a people, then a category of separate schooling in 1953.",
    provenance: "machine",
  },
  sanankuya: {
    definition:
      "Mande joking kinship: a pact between two clan names whose bearers owe each other ritual mockery and assistance, and to whom conflict is forbidden. The name binds: to bear one of the two is to inherit the pact.",
    corpusExample:
      "Keïta and Coulibaly, whose pact is reported as going back to Soundiata.",
    provenance: "machine",
  },
  "tradition-inventee": {
    definition:
      "A recent practice that presents itself as immemorial — and which is often all the more effective for being new.",
    corpusExample:
      "The postname, decreed in 1972, is borne today as a heritage.",
    provenance: "machine",
  },
  transculturation: {
    definition:
      "Two cultures that meet do not absorb one another: they produce a third thing, and both come out of it changed.",
    corpusExample: "Mami Wata and the Hamburg chromolithography of the 1880s.",
    provenance: "machine",
  },
  tribu: {
    definition:
      "A term of colonial administration, which ranks where it claims to describe. The atlas writes “people” everywhere, without exception, and keeps this one only in order to speak of it.",
    corpusExample:
      "None of the 800 records uses the word to designate what it describes.",
    absenceReason:
      "The term is defined in order to be set aside. It instantiates nothing in the corpus, and that is the point.",
    provenance: "machine",
  },
};
