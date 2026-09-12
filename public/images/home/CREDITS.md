# Home illustrations — provenance and licences

These images are not stock photography. Each one is a document the block it
sits in is _about_, which is why a generic photograph of the continent would
not substitute for any of them.

Licences were read from the Wikimedia Commons API (`extmetadata`), not
assumed. Anything under CC BY-SA must keep its credit visible in the
rendered page, not only in this file — `ChapterPlate`, which opens each
chapter of `/[lang]/about`, prints the author, the licence's own address and
a link to the file as the figure caption. A notice a reader cannot reach is
not a notice (brand charter §9).

Three of the four are in use. `PurposeBlocks`, which showed all four on the
About page, was cut on 11 September 2026 for carrying three screens of prose;
its plates came back the same day without the prose. The hero still carries
al-Idrisi and Ogilby.

## `al-idrisi-1154.jpg`

- **Work**: Muhammad al-Idrisi, world map from the _Tabula Rogeriana_, 1154 —
  drawn for Roger II of Sicily, oriented with south at the top.
- **Source**: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Al-Idrisi%27s_world_map.JPG)
- **Licence**: **Public domain** — read from the Commons API (`extmetadata`:
  `LicenseShortName = Public domain`), not assumed. No attribution required,
  credited anyway.
- **Why this one**: the hero's headline is about who names, from where, and
  when. Al-Idrisi was born in Ceuta and drew the world from inside it, south
  up, so Africa fills the upper half. A photograph of the continent would
  illustrate the page; this argues it.
- **Edit**: none beyond the Commons 960px rendition.

## `guinea-ogilby-1670.jpg`

- **Work**: John Ogilby, _Guinea_, 1670 — map of the West African coast
  showing the Gold, Slave and Ivory coasts.
- **Source**: [Wikimedia Commons](<https://commons.wikimedia.org/wiki/File:1670_Ogilby_Map_of_West_Africa_(_Gold_Coast,_Slave_Coast,_Ivory_Coast_)_-_Geographicus_-_Guinea-ogilby-1670.jpg>)
- **Licence**: **Public domain** — no attribution required, credited anyway.
- **Why this one**: the coast is labelled by merchandise, and the cartouche
  is held up by an elephant tusk. It is the argument of the block, drawn in
  1670 by the people who made it.
- **Edit**: cropped to the coastal band and the cartouche, resized to 900px.

## `tifinagh-algeria.jpg`

- **Work**: Tifinagh inscriptions carved in rock, Algeria (2006).
- **Author**: Patrick Gruban.
- **Source**: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Tifinagh_Algeria.jpg)
- **Licence**: **CC BY-SA 2.0** — attribution and licence notice are
  **required**. The caption rendered by `ChapterPlate` carries the author, the
  licence linked to its own URI, and a link to the Commons file. Asserted by
  `AboutPageContent.test.tsx`, so the notice cannot quietly go missing.
- **Why this one**: the block is about a people the Greeks named _barbaros_,
  "those who do not speak our language". Showing their writing answers it.
- **Edit**: cropped to the inscriptions, resized to 900px.

## `wilhelm-bleek.jpg`

- **Work**: photographic portrait of Wilhelm Bleek (1827–1875).
- **Source**: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Wilhelm_Bleek.jpg)
- **Licence**: **Public domain**.
- **Why this one**: Bleek coined "Bantu". The block was about him.
- **Status**: **not rendered anywhere since 11 September 2026**, when the block
  that used it was cut. Kept on disk rather than deleted: the portrait is the
  only public-domain one available, and the subject recurs across the corpus.
- **Note**: the only public-domain portrait available is 183px wide. It is
  used at vignette size deliberately — enlarging it would be blurry, and
  substituting another face would misidentify the subject.
