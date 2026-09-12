"""Render an ordered carousel — six to eight cards for one subject, three formats.

    ./venv/bin/python ethni_carousel.py <Sujet>

Reads `<projet>/cards.json` and the project's `assets/`, writes into the campaign's
draft folder. `ethni_card.py` renders one image per subject; this renders a
sequence, and a sequence needs three things that a single card never did: an order
that survives the upload, a role per card, and a body of text.

Doctrine: `Gabarits/GABARITS-SOCIAL.md`, which replaced the visual doctrine and the
two template notes on 2026-09-10. Colours and faces come from it and from
`Gabarits/tokens/`, through `ethni_tokens.py` — never from a literal here.

## The three roles

| Role | What it does | What it carries |
| --- | --- | --- |
| `couverture` | decides whether anybody scrolls at all | série · nom · lieu · question · corps |
| `entree`     | makes one point, once | plaque · titre · corps · source |
| `cloture`    | closes and gives the address | titre · corps |

The cover is the approved single-card composition and carries no plaque. It is the
only card that competes in a feed, so it is the one that must stay exactly what
already won this channel; the entries are read after the swipe decision, in a
different attention regime, and can afford a figure and a paragraph.

## The rules the renderer enforces rather than documents

- **One gold per card.** Everything is white; the accent goes to the name the card
  is examining, and nowhere else. A card that would spend it twice fails.
- **The rank leads the filename.** `peul_01_instagram-facebook_1080x1350.png`.
  Ranks must be 1..n with no hole and no repeat, or the order is already lost.
- **A card with a visual and fewer than two credit lines fails.** The licence is in
  the frame or the card does not exist.
- **The claim's source and the image's licence never share a block.** The source
  sits under the body because it belongs to the argument; the licence sits at the
  bottom because it belongs to the picture. Collapsing them would tell the reader
  the photograph proves the claim.
- Every glyph is checked against the face that will draw it, and every line against
  its safe box, by `ethni_type.py`.

## cards.json

    {
      "campaign": "fulbe-quatre-noms",
      "serie":    "Le vrai nom",
      "outDir":   "…/Brouillon/Peuples-Peul/peul-fula-fulani/images",
      "cards": [
        {"rank": 1, "role": "couverture",
         "nom": "Peul", "lieu": "Mali · aujourd'hui",
         "question": ["Aucun de ces noms", "n'est le leur ?"],
         "asset": "01-mopti.jpg", "credit": ["…", "…"]},

        {"rank": 2, "role": "entree",
         "plaque": {"accent": "second",
                    "premier": {"text": "Pel",  "gloss": "un mot wolof"},
                    "second":  {"text": "Peul", "gloss": "repris par les colons français"}},
         "titre":  "Le nom français vient du wolof.",
         "corps":  "Les Français l'ont pris à leurs voisins wolof, et il est resté.",
         "source": "Fiche Fulbe du Massina",
         "asset": "02-saint-louis.jpg", "credit": ["…", "…"]},

        {"rank": 6, "role": "cloture",
         "titre": "Quatre voisins les ont nommés. Aucun ne leur a demandé.",
         "corps": "Leur nom à eux tient en deux mots, et il est sur l'atlas.",
         "asset": "06-danse.jpg", "credit": ["…", "…"]}
      ]
    }
"""
import json
import pathlib
import re
import sys

from PIL import Image, ImageDraw

import ethni_compose_v1 as compose
import ethni_type as typo
from ethni_brand import draw_lockup
from ethni_card import FORMATS, shaded
from ethni_paths import assert_writable, resolve_project

HARNESS = pathlib.Path(__file__).resolve().parent

# The content band, as fractions of height, per format. It starts under the top of
# the frame and stops above the credit block, which `ethni_card.py` already owns.
#
# The block is packed from the TOP of that band and never distributed across it.
# The operator's ruling on the first witness: « Le titre de la série ou de la vidéo
# ne va pas avoir un espacement énorme avec le reste du contenu. » A block that
# spreads to fill its band puts three hundred pixels of nothing between the series
# line and the name, which is exactly what looked chaotic.
BAND = {
    "instagram-facebook_1080x1350": (0.075, 0.745),
    "tiktok-story_1080x1920":       (0.105, 0.715),
    "linkedin_1200x1200":           (0.060, 0.740),
}

# The type scale is set per format, not derived from the width alone. A square is
# as wide as the 9:16 and two thirds of its height, so width-only scaling gives it
# 9:16 type in a band that cannot hold it — the square failed by 123 px on the
# cover. The text is validated word for word and does not get shortened to fit a
# format, so the format gets a scale.
# The type scale is SOLVED per deck and per format, never fixed and never guessed.
#
# The card text is validated word for word and does not get shortened to fit a
# frame, so the frame has to fit the text. A square is as wide as the 9:16 and two
# thirds of its height; scaling by width alone gave it 9:16 type in a band that
# could not hold it, and the cover failed by 123 px. Solving also means the eight
# remaining carousels never meet a « raccourcis le corps » on copy they are
# forbidden to touch.
#
# One scale per format for the whole deck, not per card: six cards set at six
# different sizes is the incoherence this grammar exists to remove.
SCALE_CEILING = 1.00


def solve_scale(deck, fmt):
    top_frac, bottom_frac = BAND[fmt["file"]]
    band = fmt["h"] * bottom_frac - fmt["h"] * top_frac
    cards = [dict(c, serie=deck.get("serie")) for c in deck["cards"]]
    w, safe = fmt["w"], 0.84
    return compose.solve_scale(
        lambda s: max(compose.height(c, c["role"], w * s, safe / s) for c in cards),
        band, SCALE_CEILING)





# Any token that names a licence. A credit that matches none of these states no
# licence at all, and a visual whose licence is not on screen does not ship.
LICENCE = re.compile(
    r"CC0|CC BY-SA \d(\.\d)?|CC BY-ND|CC BY-NC|CC BY \d(\.\d)?"
    r"|domaine public|public domain|licence ouverte|open licence", re.I)
# Already-written mentions of the card's own licence, normalised away so the
# engine owns that line rather than nine sessions writing it nine ways.
OWN_LICENCE = re.compile(r"\s*·\s*carte\s+CC[^·]*", re.I)


def deck_licence(deck):
    """The licence the finished cards inherit, or None if they inherit nothing.

    A card built on a photograph is a derivative work and takes on that
    photograph's obligations, not only its credit. Where any source is share-alike
    the whole series goes out share-alike, and it has to say so.

    Four carousels mix share-alike versions — 2.0 with 4.0, 3.0 with 4.0. Both
    2.0 and 3.0 carry the « later version with the same licence elements » clause,
    so releasing the derivative at 4.0 resolves the mix instead of hiding it. The
    judgement itself lives in `ethni_compose.derived_licence`, which the video
    engine reads too.
    """
    return compose.derived_licence(
        [l for c in deck["cards"] for l in c.get("credit", [])])


def check(deck):
    """Everything that can be wrong before a single pixel is drawn."""
    cards = deck["cards"]
    # Six to eight is the rule and it stays the rule. Its stated reason is the
    # ceiling — beyond eight a sequence becomes a list — and the floor was never
    # argued anywhere. So a deck may declare itself an exception in writing, and the
    # reason travels with the file rather than living in somebody's memory. Card
    # text is validated word for word and is never rewritten to satisfy a renderer,
    # which is the only situation this is for.
    floor = 5 if deck.get("exception") else 6
    assert floor <= len(cards) <= 8, (
        f"{len(cards)} cartes : un carrousel en porte six à huit. Au-delà, une "
        f"suite devient une liste, et une liste n'ouvre aucune dette. En dessous, "
        f"le deck déclare « exception » avec sa raison, ou il ne passe pas")
    if deck.get("exception"):
        print(f"exception déclarée · {len(cards)} cartes · {deck['exception']}", flush=True)

    ranks = [c.get("rank") for c in cards]
    assert ranks == list(range(1, len(cards) + 1)), (
        f"les rangs sont {ranks} et doivent être 1..{len(cards)} dans l'ordre : "
        f"le rang porte le nom de fichier, et un trou perd l'ordre à l'upload")

    assert cards[0]["role"] == "couverture", "la carte 1 est la couverture"
    assert cards[-1]["role"] == "cloture", "la dernière carte est la clôture"

    for card in cards:
        rank, role = card["rank"], card.get("role")
        compose.check_card(card, role, rank)
        assert card.get("asset"), f"carte {rank} : aucune photographie"
        # A visual whose licence is not on screen does not go out.
        assert len(card.get("credit", [])) >= 2, (
            f"carte {rank} : le crédit de licence tient en deux lignes dans le "
            f"cadre — ce qu'elle montre, puis qui l'a faite et sous quelle licence")
        assert LICENCE.search(" ".join(card["credit"])), (
            f"carte {rank} : le crédit ne nomme aucune licence — "
            f"{card['credit'][-1]!r}. Une image dont la licence n'est pas dans le "
            f"cadre ne sort pas ; nomme-la, ou change d'image")


        if role == "entree":
            assert card.get("plaque") or card.get("chiffre"), (
                f"carte {rank} : une entrée porte une figure, une plaque ou un "
                f"chiffre — sinon c'est un paragraphe sur une photo")


def render(card, deck, fmt, scale, assets, out_dir, licence=None):
    w, h = fmt["w"], fmt["h"]
    # Type is measured against a virtual width, so the scale is a deck-wide choice;
    # the safe box stays a fraction of the real frame.
    tw = w * scale
    maxw_frac = 0.84 / scale
    im = shaded(assets / card["asset"], w, h)

    top_frac, bottom_frac = BAND[fmt["file"]]
    band_top, band_bottom = h * top_frac, h * bottom_frac
    filled = dict(card, serie=deck.get("serie"))
    total = compose.height(filled, card["role"], tw, maxw_frac)
    assert total <= band_bottom - band_top, (
        f"carte {card['rank']} en {fmt['file']} : {round(total)} px pour une bande "
        f"de {round(band_bottom - band_top)} px à l'échelle {scale:.2f}")
    compose.draw(im, filled, card["role"], band_top, tw, maxw_frac)

    # The licence, where it has always been, and the handle under it.
    d = ImageDraw.Draw(im)
    from ethni_card import block, fit
    # The photograph's licence stays on the photographer's line. The card's own
    # licence goes on ours, because it is our obligation and not theirs.
    lines = [OWN_LICENCE.sub("", l) for l in card["credit"]]
    handle = "ethniafrica.com · @ethniafrica"
    if licence:
        handle += f" · carte {licence}"
    lines = lines + [handle]
    block(d, im, lines, h * fmt["credit"],
          fit(d, lines, "sans", round(25 * fmt["scale"] * w / 1080), w * .84 * .95),
          typo.PALETTE["white"], gap_frac=.55)
    draw_lockup(im, fmt["scale"])

    name = f"{deck['campaign']}_{card['rank']:02d}_{fmt['file']}.png"
    out = out_dir / name
    im.convert("RGB").save(out)
    return out


def main():
    root = resolve_project(sys.argv[1] if len(sys.argv) > 1 else None)
    deck = json.loads((root / "cards.json").read_text(encoding="utf-8"))
    check(deck)

    assets = root / "assets"
    for card in deck["cards"]:
        assert (assets / card["asset"]).exists(), (
            f"carte {card['rank']} : {assets / card['asset']} est introuvable")

    out_dir = assert_writable(pathlib.Path(deck["outDir"]).expanduser().resolve())
    out_dir.mkdir(parents=True, exist_ok=True)

    licence = deck_licence(deck)
    print(f"licence héritée par les cartes : {licence or 'aucune'}", flush=True)
    for fmt in FORMATS:
        scale = solve_scale(deck, fmt)
        print(f"{fmt['file']} · échelle typographique {scale:.2f}", flush=True)
        for card in deck["cards"]:
            print("  ", render(card, deck, fmt, scale, assets, out_dir, licence).name, flush=True)
    print(f"{len(deck['cards']) * len(FORMATS)} images — "
          f"{len(deck['cards'])} cartes × {len(FORMATS)} formats → {out_dir}", flush=True)


if __name__ == "__main__":
    main()
