# Anecdote illustrations — provenance and licences

One picture per anecdote in `src/lib/home/didYouKnowIllustrations.ts`. None of
them is stock photography: each is a document the anecdote is _about_ — the map
that repeats itself, the object that was traded, the person who did the naming.
A generic photograph of the continent would illustrate none of them, and under
a decolonial editorial posture it would illustrate the wrong thing.

Licences were read from the Wikimedia Commons API (`extmetadata`), not assumed.
Every file below is public domain, CC0, CC BY or CC BY-SA. The attribution
required by CC BY and CC BY-SA is printed under the picture by `AnecdoteCard`,
not only filed here — a credit the reader cannot see does not satisfy the
licence. `didYouKnowIllustrations.test.ts` fails the build if a `credit` line
stops naming one.

All files were fetched at Commons' 1400px thumbnail and resized to 1100px on
the long edge, JPEG quality 72. Two anecdotes reuse a file the repo already
carries for the home and are listed at the end.

| Anecdote                  | File                          | Work                                                                                      | Author                                             | Licence       |
| ------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------- |
| `monrovia`                | `monrovia.jpg`                | Map of Liberia, c. 1870, annotated in ink                                                 | American Colonization Society / D. McClelland      | Public domain |
| `bantou`                  | `bantou.jpg`                  | Guthrie's Bantu zones (with Tervuren's zone J)                                            | Edricson                                           | CC BY-SA 3.0  |
| `cote-ivoire`             | `cote-ivoire.jpg`             | Tusk Carving with Figures, 19th c., Brooklyn Museum 1992.136.14                           | Unknown                                            | CC BY 3.0     |
| `lingala`                 | `lingala.jpg`                 | The paddle steamer _Livingstone_ at Baringa, Congo, c. 1900-1915                          | Unknown                                            | Public domain |
| `personne-relationnelle`  | `personne-relationnelle.jpg`  | Annual meeting of the men of Ribina, Nigeria, 1970-1973 (ASC Leiden, Rietveld Collection) | Aart Rietveld                                      | CC BY-SA 4.0  |
| `afrique`                 | `afrique.jpg`                 | Antonine Baths at Carthage, Tunisia (2007)                                                | Institute for the Study of the Ancient World       | CC BY 2.0     |
| `burkina-faso`            | `burkina-faso.jpg`            | Ouagadougou from the air, winter 1930-1931                                                | Walter Mittelholzer (1894-1937)                    | Public domain |
| `cameroun`                | `cameroun.jpg`                | Pirogues on the Wouri, Douala (2020)                                                      | Kondah                                             | CC BY-SA 4.0  |
| `benin-dahomey`           | `benin-dahomey.jpg`           | Cast brass plaque from Benin City, 16th c., British Museum room 25                        | Vassil                                             | CC0           |
| `nigeria-flora-shaw`      | `nigeria-flora-shaw.jpg`      | Flora Shaw (Lady Lugard) and Frederick Lugard, 1908                                       | Arnold Wright                                      | Public domain |
| `zimbabwe-grand-zimbabwe` | `zimbabwe-grand-zimbabwe.jpg` | Outer walls of Great Zimbabwe                                                             | Credited on Commons to Edwin Smith and Andrew Dale | CC BY-SA 4.0  |
| `prefixes-bantous`        | `prefixes-bantous.jpg`        | Village in the Maloti mountains, Lesotho (2016)                                           | SkyPixels                                          | CC BY-SA 4.0  |
| `peul-dix-noms`           | `peul-dix-noms.jpg`           | Railway station, Dakar, 1972 — a man in a pointed Fulani straw hat (ASC Leiden)           | Fred van der Kraaij                                | CC BY-SA 4.0  |
| `khoikhoi-hottentot`      | `khoikhoi-hottentot.jpg`      | « Hottentote », hand-tinted engraving, c. 1797, LACMA M.83.190.325                        | Jacques Grasset de Saint-Sauveur / Labrousse       | Public domain |
| `pygmee-homere`           | `pygmee-homere.jpg`           | Attic red-figure plastic vase, a pygmy carrying a killed crane (geranomachy)              | ArchaiOptix                                        | CC BY-SA 4.0  |
| `lac-lac`                 | `lac-lac.jpg`                 | Map of Africa, c. 1847                                                                    | Victor Levasseur / Frédéric-Guillaume Laguillermie | Public domain |
| `tombouctou`              | `tombouctou.jpg`              | Djinguereber Mosque, Timbuktu (2020)                                                      | Ondřej Havelka                                     | CC BY-SA 4.0  |
| `fleuve-niger`            | `fleuve-niger.jpg`            | Boatmen poling a pinasse on the Niger                                                     | PGskot                                             | CC BY-SA 4.0  |
| `ethiopie`                | `ethiopie.jpg`                | Illuminated Gospel, Amhara, late 14th–early 15th c., Metropolitan Museum of Art           | Metropolitan Museum of Art open access             | CC0           |
| `guinee`                  | `guinee.jpg`                  | Wall map of Africa, 1794, after d'Anville                                                 | Solomon Boulton / J.-B. Bourguignon d'Anville      | Public domain |
| `tanzanie`                | `tanzanie.jpg`                | Julius Nyerere, 1975 (Fotocollectie Anefo)                                                | Rob Mieremet / Anefo                               | CC0           |
| `mozambique`              | `mozambique.jpg`              | Igreja de São Sebastião, fort of São Sebastião, Island of Mozambique (2007)               | Erik Cleves Kristensen                             | CC BY 2.0     |
| `sierra-leone`            | `sierra-leone.jpg`            | Bay of Free Town, Sierra Leone — Imray nautical guide, 1884                               | British Library, Mechanical Curator collection     | Public domain |

Each file page on Commons is reachable at
`https://commons.wikimedia.org/wiki/File:<original file name>`; the original
names are the ones recorded in the job that fetched them and are preserved in
the descriptions above.

## Reused from the home

- `amazigh` → `/images/home/tifinagh-algeria.jpg`. Tifinagh inscriptions in
  rock, Algeria, by Patrick Gruban, CC BY-SA 2.0. The home's `PurposeBlocks`
  already argues from this exact picture, for the same reason; a second copy
  at a second path would be the same file twice. Full entry in
  `public/images/home/CREDITS.md`.

## Notes

- **`zimbabwe-grand-zimbabwe`** — Commons records the authors as Edwin Smith
  and Andrew Dale (ethnographers of the 1920s) against a CC BY-SA 4.0 licence
  and a 2020 upload date. The two do not obviously agree; the credit follows
  what Commons asserts rather than what the dates suggest, and the file page is
  the place to settle it if it ever matters.
- **`cote-ivoire`** and **`lingala`** carry no named author on Commons. They are
  credited to the holding institution and to the public domain respectively,
  which is what the file pages support.
