import type { CorpusCounts } from "@/lib/home/corpusCounts";

/**
 * The classes the home's tile band puts a total against, in one list.
 *
 * `import type` only: this list is read by a client component, and
 * `corpusCounts` reaches Supabase. The type is erased at build; the services
 * are not.
 *
 * Order is what the reader arrives with, then what the corpus does with it:
 * peuples first, because that is the question most arrive with, then the
 * langues they speak, then the noms they carry. It is no longer the corpus's
 * own famille → langue → peuple → pays nesting, because the third tile no
 * longer sits on that ladder — a nom is borne by peoples and attested in
 * countries and belongs to no rung of it.
 *
 * **Three, not the corpus's six.** Familles, pays and appellations are
 * documented, indexed and searchable, and they are not counted here. The band
 * is a first impression, and more figures spent it teaching the corpus's
 * taxonomy to a reader who had not yet asked for it — the widest of them,
 * « 3 134 appellations », also forced a six-column grid at 430px to fold five
 * tiles into two rows without a hole.
 *
 * **Pays gave its tile to noms.** 54 counts a closed set the reader already
 * holds: Africa's country count is common knowledge, so the figure measured
 * the continent rather than the atlas's work on it. The nom axis is the
 * opposite — a reader does not know it exists until the band says so, and
 * DEC-038 gave it a public word precisely so it could be named.
 *
 * That trade is honest about its cost: the nom corpus is young, so this tile
 * prints a figure two orders of magnitude below the two beside it. The scope
 * word carries that — « noms documentés » is a claim about what the atlas has
 * done, not about how many names Africa holds — and it is the same defence
 * every other label on this band relies on.
 *
 * What the three-of-six choice costs, and what pays for it: three totals read
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
  // `patronymes`, never `nameForms`: DEC-038 keeps the two objects the corpus
  // calls "name" apart, and they are an order of magnitude apart in size, so
  // reading the wrong one puts a wrong figure under a right label.
  { key: "patronymes", tileLabel: "noms documentés" },
];
