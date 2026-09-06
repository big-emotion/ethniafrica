import type { Language } from "@/types/shared";

// @req REQ-141
export const sourcesBibliographyNote: Record<Language, string> = {
  en: "Wikipedia is not a source. A primary source found through it is cited at its own standing and address, and cross-language versions are recorded. Entries marked ‘Awaiting review’ are those for which this source-tracing work is not complete.",
  fr: "Wikipédia n'est pas une source. Une source primaire trouvée par son intermédiaire est citée à son propre palier, par sa propre adresse, et les versions linguistiques croisées sont notées. Les entrées marquées « En attente d'examen » sont celles dont ce travail de remontée n'est pas terminé.",
};

// @req REQ-141
export const englishCountryNames: Readonly<Record<string, string>> = {
  algeria: "Algeria",
  morocco: "Morocco",
  tunisia: "Tunisia",
  egypt: "Egypt",
  libya: "Libya",
  sudan: "Sudan",
  mauritania: "Mauritania",
  westernSahara: "Western Sahara",
  benin: "Benin",
  coteIvoire: "Ivory Coast",
  gambia: "The Gambia",
  guinea: "Guinea",
  guineaBissau: "Guinea-Bissau",
  nigeria: "Nigeria",
  senegal: "Senegal",
  cameroon: "Cameroon",
  centralAfricanRepublic: "Central African Republic",
  chad: "Chad",
  drc: "DR Congo",
  equatorialGuinea: "Equatorial Guinea",
  saoTome: "São Tomé and Príncipe",
  ethiopia: "Ethiopia",
  uganda: "Uganda",
  tanzania: "Tanzania",
  somalia: "Somalia",
  eritrea: "Eritrea",
  mauritius: "Mauritius",
  comoros: "Comoros",
  southSudan: "South Sudan",
  southAfrica: "South Africa",
  namibia: "Namibia",
  zambia: "Zambia",
};

// @req REQ-141
export const englishCountrySourceNotes: Readonly<
  Record<string, { name?: string; description?: string }>
> = {
  libya: { name: "No operational institute → UN and CIA data" },
  westernSahara: { name: "UN data and academic reports (Hassaniya)" },
  guineaBissau: {
    description: "(no operational website → UN and CIA data)",
  },
  equatorialGuinea: { name: "CIA and UN data" },
  somalia: { name: "UN and CIA data" },
  eritrea: { name: "UN and CIA data (no public statistics)" },
  southSudan: { name: "UN and CIA data" },
};
