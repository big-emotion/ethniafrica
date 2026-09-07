import { NOMMER_FIGURES } from "@/lib/dossiers/nommer/figures";
import { formatNumber } from "@/lib/languageTag";
import type { Language } from "@/types/shared";

/**
 * The three numbers the dossier rests on, stated as composition rather than
 * as paragraphs.
 *
 * Each is a `<p>` at hero size — licensed by name in the typography charter
 * §3: "the key figure … set at `hero` inside a `<p>` — it is a number, not a
 * section". A card's three-level rule does not apply, because these are not
 * cards; they are the band.
 *
 * All three take the page accent. Brand charter §5.2: three sibling blocks of
 * the same kind are told apart by their content, "never by rotating through
 * the palette" — a colour that changes with position carries no meaning and
 * reads as decoration.
 *
 * The third measure is the one that matters most and is easiest to get wrong.
 * 445 of 775 is 57,4 %, and printing that percentage would let a reader infer
 * that the other 330 fiches were examined and found sound. 311 were never
 * examined at all. So the band publishes the gap beside the finding, which is
 * what the atlas charter §4 asks of an absent value.
 */

const countedValue = (figureKey: string): number => {
  const figure = NOMMER_FIGURES[figureKey];
  return figure && figure.kind === "counted" ? figure.value : 0;
};

interface Measure {
  value: string;
  claim: string;
  provenance: string;
}

const measures = (language: Language): Measure[] => {
  const exonyms = countedValue("corpus-exonyms");
  const autonyms = countedValue("corpus-autonyms");
  const contested = countedValue("status-contested-or-colonial");
  const peoples = countedValue("corpus-peoples");
  const undeclared = countedValue("status-undeclared");
  const africanChoice = countedValue("countries-african-choice");
  const countries = countedValue("corpus-countries");

  if (language === "en") {
    return [
      {
        value: `${Math.round(exonyms / autonyms)} to 1`,
        claim:
          "The corpus holds four names from outside for every name from within.",
        provenance: `${formatNumber(language, exonyms)} exonyms against ${formatNumber(language, autonyms)} autonyms, counted in the records`,
      },
      {
        value: `${contested} out of ${peoples}`,
        claim:
          "That many peoples declare their own name contested or inherited from colonisation.",
        provenance: `and ${undeclared} records declare nothing at all — the figure a percentage would erase`,
      },
      {
        value: `${africanChoice} out of ${countries}`,
        claim: "That many countries bear a name chosen by Africans.",
        provenance:
          "a manual reading of the 54 etymologies, none of which the corpus yet supports with a source",
      },
    ];
  }

  return [
    {
      value: `${Math.round(exonyms / autonyms)} pour 1`,
      claim:
        "Le corpus tient quatre noms venus du dehors pour un nom venu du dedans.",
      provenance: `${formatNumber(language, exonyms)} exonymes contre ${formatNumber(language, autonyms)} autonymes, comptés sur les fiches`,
    },
    {
      value: `${contested} sur ${peoples}`,
      claim:
        "Autant de peuples déclarent leur propre nom contesté ou hérité de la colonisation.",
      provenance: `et ${undeclared} fiches ne déclarent rien du tout — le chiffre qu'un pourcentage effacerait`,
    },
    {
      value: `${africanChoice} sur ${countries}`,
      claim: "Autant de pays portent un nom que des Africains ont choisi.",
      provenance:
        "lecture à la main des 54 étymologies, qu'aucune source du corpus n'appuie encore",
    },
  ];
};

// @req REQ-113
export const ThesisMeasures = ({ language }: { language: Language }) => (
  <ul className="grid list-none grid-cols-1 gap-afh-xl p-0 sm:grid-cols-3">
    {measures(language).map((measure) => (
      <li key={measure.value} className="text-left">
        <p className="font-afh-display text-afh-h1 font-black leading-none text-[color:var(--accent-ink)]">
          {measure.value}
        </p>
        <p className="mt-afh-sm text-afh-body text-afh-text">{measure.claim}</p>
        <p className="mt-afh-sm text-afh-caption text-afh-text-soft">
          {measure.provenance}
        </p>
      </li>
    ))}
  </ul>
);
