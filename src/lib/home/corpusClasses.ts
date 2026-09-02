import type { CorpusCounts } from "@/lib/home/corpusCounts";

/**
 * The five classes the home's census line declares, in one list.
 *
 * `import type` only: this list is read by a client component, and
 * `corpusCounts` reaches Supabase. The type is erased at build; the services
 * are not.
 *
 * Order is the corpus's own nesting — family → language → people → country —
 * read outwards from the reader: peoples first because that is the question
 * most arrive with, appellations last because they are what the other four are
 * named by.
 */
export interface CorpusClass {
  key: keyof CorpusCounts;
  /**
   * The plural noun the census prints. Named for the line that carries it
   * rather than for the h1: the headline named a class until the census line
   * took the job, and a field called `headlineWord` outlived that by exactly
   * as long as nobody re-read it.
   */
  censusWord: string;
}

// @req REQ-113
export const CORPUS_CLASSES: readonly CorpusClass[] = [
  { key: "peoples", censusWord: "peuples" },
  { key: "languages", censusWord: "langues" },
  { key: "countries", censusWord: "pays" },
  { key: "families", censusWord: "familles" },
  {
    // Appellations, not patronymes. This counts the folded name *forms* of the
    // peoples — 742 endonyms against 2742 exonyms — which is the corpus's own
    // argument about naming, and it has a page of its own at
    // /fr/atlas/appellations.
    //
    // It is deliberately not the same thing as the search panel's "Noms"
    // group, which returns patronyme fiches — two different objects that
    // happen to both be names.
    key: "nameForms",
    censusWord: "appellations",
  },
];
