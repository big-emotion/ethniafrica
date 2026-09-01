import type { CorpusCounts } from "@/lib/home/corpusCounts";

/**
 * The five classes the home declares, in one list.
 *
 * The headline names them and the tiles count them, and those two used to be
 * separate arrays in separate files — which is precisely how the band came to
 * ask about peoples above a corpus holding five kinds. Reading both from here
 * makes that drift impossible rather than merely tested.
 *
 * `import type` only: this list is read by a client component, and
 * `corpusCounts` reaches Supabase. The type is erased at build; the services
 * are not.
 *
 * Order is the corpus's own nesting — family → language → people → country —
 * read outwards from the reader: peoples first because that is the question
 * most arrive with, appellations last because they are what the other four are
 * named by.
 *
 * The tile label is plural and full; the headline word is short. The tile says
 * "Familles linguistiques" where the headline says "familles": the h1 is
 * already the tallest element in the band and the full label costs it a line
 * at 430px.
 */
export interface CorpusClass {
  key: keyof CorpusCounts;
  tileLabel: string;
  headlineWord: string;
}

// @req REQ-113
export const CORPUS_CLASSES: readonly CorpusClass[] = [
  { key: "peoples", tileLabel: "Peuples", headlineWord: "peuples" },
  { key: "languages", tileLabel: "Langues", headlineWord: "langues" },
  { key: "countries", tileLabel: "Pays", headlineWord: "pays" },
  {
    key: "families",
    tileLabel: "Familles linguistiques",
    headlineWord: "familles",
  },
  {
    // Appellations, not patronymes. This counts the folded name *forms* of the
    // peoples — 742 endonyms against 2742 exonyms — which is the corpus's own
    // argument about naming, and it has a page of its own at
    // /fr/atlas/appellations.
    //
    // It is deliberately not the same thing as the search panel's "Noms"
    // group, which returns patronyme fiches. Those are two different objects
    // that happen to both be names, and collapsing them would make the tile
    // claim 3134 of something the panel returns 30 of.
    key: "nameForms",
    tileLabel: "Appellations",
    headlineWord: "appellations",
  },
];
