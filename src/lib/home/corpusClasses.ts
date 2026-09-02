import type { CorpusCounts } from "@/lib/home/corpusCounts";

/**
 * The classes the home's tile band puts a total against, in one list.
 *
 * `import type` only: this list is read by a client component, and
 * `corpusCounts` reaches Supabase. The type is erased at build; the services
 * are not.
 *
 * Order is the corpus's own nesting — family → language → people → country —
 * read outwards from the reader: peoples first, because that is the question
 * most arrive with.
 *
 * **Three, not the corpus's five.** Familles and appellations are documented,
 * indexed and searchable, and they are no longer counted here. The band is a
 * first impression, and five figures spent it teaching the corpus's taxonomy
 * to a reader who had not yet asked for it — the widest of them, « 3 134
 * appellations », also forced a six-column grid at 430px to fold five tiles
 * into two rows without a hole.
 *
 * What that choice costs, and what pays for it: three totals out of five read
 * as the corpus entire unless something says otherwise, so every `tileLabel`
 * carries the scope word and the band's accessible name is « Ce que l'atlas
 * documente », not « Le corpus en chiffres ». That is the whole mitigation,
 * and `homeClassesCharter.test.tsx` holds it — a label edited back to a bare
 * noun reinstates the claim this band gave up making. The classes that lost
 * their figure keep every other surface they had: a menu entry, a faceted
 * index, a search group, and the prose that names all six (`corpusNoun`).
 */
export interface CorpusClass {
  key: keyof CorpusCounts;
  /**
   * The label under the figure. Lowercase and scoped — « peuples documentés »,
   * not « Peuples » — because the tile is read as one phrase from the number
   * down, and the scope word is the band's only defence against being read as
   * a claim of exhaustiveness.
   */
  tileLabel: string;
}

// @req REQ-113
export const CORPUS_CLASSES: readonly CorpusClass[] = [
  { key: "peoples", tileLabel: "peuples documentés" },
  { key: "languages", tileLabel: "langues documentées" },
  { key: "countries", tileLabel: "pays documentés" },
];
