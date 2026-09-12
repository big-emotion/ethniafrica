# Faces shipped with the render engine

The engine rasterises text itself, so the `.ttf` files travel with it rather than
being installed per machine. A face resolved from the system would render a
different shape on a different workstation, and the suites that compare a fresh
render against a known one would fail for a reason that is not a defect.

All six families below are published by their authors under the **SIL Open Font
License 1.1**, which permits bundling and redistribution provided the faces are
not sold on their own and the licence travels with them. That is what this file
is for. `OFL-Noto.txt` is the full licence text as shipped by the Noto project;
it is the same OFL 1.1 the other five carry.

| File                        | Family             | Upstream                                          |
| --------------------------- | ------------------ | ------------------------------------------------- |
| `Anton-Regular.ttf`         | Anton              | Google Fonts — Vernon Adams                       |
| `Fraunces.ttf`              | Fraunces           | Undercase Type — Phaedra Charles, Flavia Zimbardi |
| `Montserrat-ExtraBold.ttf`  | Montserrat         | Julieta Ulanovsky                                 |
| `NotoSans-Bold.ttf`         | Noto Sans          | Google Noto project                               |
| `NotoSansEthiopic-Bold.ttf` | Noto Sans Ethiopic | Google Noto project                               |
| `NunitoSans.ttf`            | Nunito Sans        | Vernon Adams, Jacques Le Bailly                   |
| `TikTokSans-Bold.ttf`       | TikTok Sans        | ByteDance, released open source                   |

**Noto Sans Ethiopic is not decoration.** It is the only face here that carries
Geʽez script, and a card naming an Ethiopian or Eritrean people in its own writing
system renders as empty boxes without it. Removing a face because no current card
uses it is how an autonym stops being displayable.

Which face plays which role is `FACES` in `ethni_type.py`, and how many display
faces a card may carry is the gabarit spec. Neither rule is restated here.
