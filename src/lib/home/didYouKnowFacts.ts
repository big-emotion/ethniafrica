/**
 * The "Saviez-vous" bank.
 *
 * Every fact here is onomastic: it is about a *name* — who gave it, when,
 * and what it was hiding. That is the constraint that keeps the band from
 * drifting into trivia. A fact that could be printed on a placemat does not
 * belong; a fact that changes how a reader hears a word they already knew
 * does.
 *
 * Each fact carries the entities it concerns, so the band is an exit into
 * the atlas rather than a cul-de-sac. Ids are corpus ids, checked against
 * the fiches — a chip pointing at a people the corpus does not hold is a
 * 404 the reader finds before we do.
 *
 * The band draws one fact per request (REQ-115's reasoning applies: the
 * draw runs server-side, so it never re-runs during hydration and cannot
 * desynchronise the client tree). With a bank this small, a curious reader
 * exhausts it in one sitting — growing it is the band's real maintenance
 * cost, not its integration.
 */

export type DidYouKnowEntityKind = "people" | "country" | "family";

export interface DidYouKnowEntity {
  kind: DidYouKnowEntityKind;
  id: string;
  label: string;
}

export interface DidYouKnowFact {
  id: string;
  /** The claim, stated as a sentence the reader can carry away. */
  headline: string;
  /** Two paragraphs at most — the band is read standing up. */
  body: string[];
  entities: DidYouKnowEntity[];
  /** Mirrors the fiche source tiers: official | referenced | unverified. */
  tier: "official" | "referenced" | "unverified";
}

// @req REQ-113
export const DID_YOU_KNOW_FACTS: DidYouKnowFact[] = [
  {
    id: "monrovia",
    headline: "La capitale du Liberia porte le nom d'un président américain.",
    body: [
      "Monrovia vient de James Monroe, cinquième président des États-Unis. C'est l'une des deux seules capitales au monde à porter le nom d'un président américain — l'autre est Washington.",
      "Le comptoir fondé en 1822 s'appelait Christopolis. Il fut rebaptisé en l'honneur de Monroe, dont le soutien avait permis à l'American Colonization Society d'acquérir le territoire où s'installèrent des Afro-Américains affranchis.",
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
  },
  {
    id: "bantou",
    headline:
      "« Bantou » n'est pas un peuple. C'est un mot forgé depuis l'Europe.",
    body: [
      "Le linguiste allemand Wilhelm Bleek a construit le terme à partir d'une racine commune à des centaines de langues : ba-, le pluriel humain, et -ntu, la personne. Ba-ntu : « les gens ».",
      "Il n'avait alors rencontré aucun locuteur — il travaillait depuis l'Europe sur des grammaires collectées par des missionnaires. L'anthropologie coloniale a ensuite détourné le mot en « races » et « cultures » bantoues, ce que Bleek n'avait jamais désigné : une famille de langues, pas une identité.",
    ],
    entities: [
      { kind: "family", id: "FLG_BANTU", label: "Langues bantoues" },
      { kind: "people", id: "PPL_ZULU", label: "Zoulou" },
      { kind: "people", id: "PPL_XHOSA", label: "Xhosa" },
      { kind: "country", id: "ZAF", label: "Afrique du Sud" },
    ],
    tier: "referenced",
  },
  {
    id: "cote-ivoire",
    headline: "La Côte d'Ivoire porte le nom de ce qu'on y achetait.",
    body: [
      "Les navigateurs portugais désignaient ce littoral par sa marchandise : Costa do Marfim, la côte de l'ivoire. À l'est, vers Assinie, on parlait déjà de la Côte de l'Or — l'actuel Ghana.",
      "En 1839, l'officier français Bouët-Willaumez francise l'appellation et la fixe officiellement. Il n'invente pas le nom : il institutionnalise un terme déjà employé depuis des siècles dans les langues européennes. Les frontières suivaient alors les logiques commerciales, pas les peuples.",
    ],
    entities: [
      { kind: "country", id: "CIV", label: "Côte d'Ivoire" },
      { kind: "country", id: "GHA", label: "Ghana" },
    ],
    tier: "referenced",
  },
  {
    id: "amazigh",
    headline:
      "« Berbère » vient du grec barbaros : celui dont on ne comprend pas la langue.",
    body: [
      "Les Romains reprennent le terme, les Arabes médiévaux aussi, et la colonisation française l'institutionnalise. Il est aujourd'hui considéré comme un exonyme imposé, parfois péjoratif.",
      "Le nom que ces peuples se donnent est Amazigh — Imazighen au pluriel — et il signifie « homme libre ». Kabyles, Chaouis, Rifains, Chleuhs, Mozabites et Touaregs sont tous Imazighen : des branches d'un même arbre, chacune avec sa région et son histoire.",
    ],
    entities: [
      { kind: "people", id: "PPL_AMAZIGH_MACRO", label: "Amazigh" },
      { kind: "country", id: "MAR", label: "Maroc" },
      { kind: "country", id: "DZA", label: "Algérie" },
    ],
    tier: "referenced",
  },
  {
    id: "lingala",
    headline: "Le nom du lingala a été inventé par des missionnaires belges.",
    body: [
      "La langue, elle, ne l'a pas été : sa base est le bobangi, grande langue commerciale du fleuve Congo, parlée par les peuples riverains bien avant l'arrivée des Européens.",
      "Au XIXe siècle, l'administration coloniale regroupe plusieurs populations du fleuve sous une même étiquette, « Bangala » — un nom que ces peuples n'employaient pas. Elle simplifie leur langue, en fixe l'orthographe, et baptise cette version standardisée lingala. Le lingala moderne garde environ 60 à 70 % de la structure bobangi.",
    ],
    entities: [
      { kind: "country", id: "COD", label: "RDC" },
      { kind: "people", id: "PPL_NGALA", label: "Ngala (Bangala)" },
    ],
    tier: "referenced",
  },
  {
    id: "personne-relationnelle",
    headline:
      "Dans une vingtaine de langues africaines, on ne peut pas dire « personne » sans dire « les autres ».",
    body: [
      "Muntu chez les Kongo et les Luba, umuntu en zoulou, motho en tswana, mogo en bambara, onipa en akan, qof en somali, amăghar en amazigh : le mot existe partout, et partout il est pris dans la même construction.",
      "« Umuntu ngumuntu ngabantu » — une personne est une personne par les autres. « Mogobe mogola », « Onipa nyɛ onipa nko ara », « Qof waa qof dad awgiis » : la même structure conceptuelle revient d'un bout à l'autre du continent. L'individu n'y est jamais pensé comme un être isolé.",
    ],
    entities: [
      { kind: "family", id: "FLG_BANTU", label: "Langues bantoues" },
      { kind: "people", id: "PPL_AKAN", label: "Akan" },
      { kind: "people", id: "PPL_SOMALI", label: "Somali" },
    ],
    tier: "unverified",
  },
];

/**
 * Draw one fact for this request.
 *
 * `random` is injected the way `pickHeroModule` injects it, so the visual
 * snapshot and the tests stay deterministic without the band losing its
 * variation in production.
 */
// @req REQ-113
export function pickDidYouKnowFact(
  random: () => number = Math.random,
  facts: DidYouKnowFact[] = DID_YOU_KNOW_FACTS
): DidYouKnowFact | null {
  if (facts.length === 0) return null;
  const index = Math.min(facts.length - 1, Math.floor(random() * facts.length));
  return facts[index];
}

/**
 * The draw the loading interstitial uses, which differs from the band's in one
 * respect: it knows what it showed last time.
 *
 * The band is seen once per visit to the home, so a uniform draw is fine there.
 * The loader is seen on every navigation, and a uniform draw over a bank this
 * small hands the reader the same fact twice in a row often enough to read as
 * broken — one navigation in six, and the reader concludes the loader is a
 * fixed image rather than a rotation. Excluding the previous fact costs one
 * parameter and removes the only failure a reader can actually notice.
 *
 * A single-fact bank repeats regardless: at that point showing it again beats
 * showing an empty wait.
 */
// @req REQ-104
export function pickNextDidYouKnowFact(
  previousId: string | null,
  random: () => number = Math.random,
  facts: DidYouKnowFact[] = DID_YOU_KNOW_FACTS
): DidYouKnowFact | null {
  const eligible = facts.filter((entry) => entry.id !== previousId);
  return pickDidYouKnowFact(random, eligible.length > 0 ? eligible : facts);
}
