"""Every real card of the corpus, in every format, against the composition rules.

    ./venv/bin/python test_corpus_compose.py

`test_ethni_compose.py` holds the contract on fixtures. This runs the same rules
over the sixty-five cards actually on disk, which is where the cases nobody
invents live: a title of two words and a title of eighteen, a 900 px engraving
next to a 3400 px scan, a body that overruns its box in the square and fits in
the reel.

It renders nothing. Geometry is a property of the plan, and reading the plan
fails with a card number and a block name instead of a pixel diff.

Contrast is measured on the ground of the palest documents the corpus holds,
because a flattering photograph proves nothing about a card.
"""
import json
import pathlib
import sys

from PIL import Image

import ethni_compose as gab
import ethni_tokens as tk
from ethni_paths import productions_root


PROJETS = productions_root()
FORMATS = ("carrousel", "linkedin", "reel")


def decks():
    for fichier in sorted(PROJETS.glob("*/cards.json")):
        deck = json.loads(fichier.read_text(encoding="utf-8"))
        if "cartes" in deck:
            yield fichier.parent, deck


def _image(dossier, carte):
    return Image.open(dossier / "assets" / carte["image"]["fichier"]).convert("RGB")


def test_every_card_plans_in_every_format():
    total = 0
    for dossier, deck in decks():
        for carte in deck["cartes"]:
            image = _image(dossier, carte)
            for fmt in FORMATS:
                gab.plan(carte, deck, fmt, image=image)
                total += 1
    assert total > 150, f"seulement {total} plans — le corpus n'a pas été lu"
    print(f"      {total} plans calculés", flush=True)


def test_nothing_overflows_anywhere_in_the_corpus():
    fautes = []
    for dossier, deck in decks():
        for carte in deck["cartes"]:
            image = _image(dossier, carte)
            for fmt in FORMATS:
                cadre = tk.fmt(fmt)
                for b in gab.plan(carte, deck, fmt, image=image).blocs:
                    if b.x < 0 or b.y < 0 or b.x + b.w > cadre["w"] or b.y + b.h > cadre["h"]:
                        fautes.append(f"{dossier.name} carte {carte['rang']} {fmt} : {b.nom}")
    assert not fautes, "blocs hors cadre :\n  " + "\n  ".join(fautes[:12])


def test_no_two_texts_collide_anywhere_in_the_corpus():
    fautes = []
    for dossier, deck in decks():
        for carte in deck["cartes"]:
            image = _image(dossier, carte)
            for fmt in FORMATS:
                textes = [b for b in gab.plan(carte, deck, fmt, image=image).blocs if b.texte]
                for i, a in enumerate(textes):
                    for b in textes[i + 1:]:
                        if (a.x < b.x + b.w and b.x < a.x + a.w
                                and a.y < b.y + b.h and b.y < a.y + a.h):
                            fautes.append(
                                f"{dossier.name} carte {carte['rang']} {fmt} : "
                                f"« {a.nom} » × « {b.nom} »")
    assert not fautes, "chevauchements :\n  " + "\n  ".join(fautes[:12])


def test_the_attribution_clears_the_interface_on_every_reel():
    """§7 — in 9:16 the credit above y = 1620, with and without a subtitle band."""
    fautes = []
    for dossier, deck in decks():
        for carte in deck["cartes"]:
            image = _image(dossier, carte)
            for sous_titre in (False, True):
                plan = gab.plan(carte, deck, "reel", image=image, sous_titre=sous_titre)
                for b in plan.blocs:
                    if b.nom.startswith("credit") and b.y + b.h > tk.SAFE_FLOOR_9_16:
                        fautes.append(
                            f"{dossier.name} carte {carte['rang']} "
                            f"(sous-titre={sous_titre}) : crédit à {b.y + b.h}")
    assert not fautes, "attribution sous l'interface :\n  " + "\n  ".join(fautes[:12])


def test_the_resolution_ceiling_holds_on_every_card():
    """§6 — no image enlarged past ×2 without the fallback having caught it."""
    fautes = []
    for dossier, deck in decks():
        for carte in deck["cartes"]:
            image = _image(dossier, carte)
            for fmt in FORMATS:
                cadre = tk.fmt(fmt)
                plan = gab.plan(carte, deck, fmt, image=image)
                bande = plan.bloc("bande-image")
                sur_ech = max(bande.w / image.width, bande.h / image.height)
                if sur_ech > tk.SUR_ECH_MAX:
                    fautes.append(
                        f"{dossier.name} carte {carte['rang']} {fmt} : ×{sur_ech:.2f} "
                        f"en disposition {plan.disposition}")
    assert not fautes, "images trop agrandies :\n  " + "\n  ".join(fautes[:12])


def _clarte(image):
    """Mean luminance, to find the documents a scrim has the hardest time with."""
    petite = image.resize((32, 32))
    pixels = list(petite.getdata())
    return sum(sum(p) / 3 for p in pixels) / len(pixels)


def test_contrast_holds_on_the_palest_documents_of_the_corpus():
    """§11 — measured on real pixels under the scrim, on the worst cases only.

    Rendering every card in every format costs minutes; the ten palest grounds
    are where a scrim fails, and the rest are strictly easier.
    """
    candidats = []
    for dossier, deck in decks():
        for carte in deck["cartes"]:
            image = _image(dossier, carte)
            candidats.append((_clarte(image), dossier.name, carte, deck, image))
    candidats.sort(key=lambda c: -c[0])

    fautes = []
    for clarte, nom, carte, deck, image in candidats[:10]:
        for fmt in FORMATS:
            fond = gab.fond_compose(carte, deck, fmt, image=image)
            for b in gab.plan(carte, deck, fmt, image=image).blocs:
                if not b.texte:
                    continue
                ratio = gab.contraste_mesure(fond, b)
                seuil = 3.0 if b.corps >= 24 else 4.5
                if ratio < seuil:
                    fautes.append(
                        f"{nom} carte {carte['rang']} {fmt} « {b.nom} » : "
                        f"{ratio:.2f}:1 < {seuil}:1 (fond à {clarte:.0f}/255)")
    print(f"      dix documents les plus clairs, de {candidats[0][0]:.0f} à "
          f"{candidats[9][0]:.0f} sur 255", flush=True)
    assert not fautes, "contraste insuffisant :\n  " + "\n  ".join(fautes[:12])


def test_no_composed_text_leaves_the_charter():
    charte = set(tk.palette().values())
    fautes = []
    for dossier, deck in decks():
        for carte in deck["cartes"]:
            image = _image(dossier, carte)
            for b in gab.plan(carte, deck, "carrousel", image=image).blocs:
                if b.texte and b.couleur not in charte:
                    fautes.append(f"{dossier.name} carte {carte['rang']} : {b.nom} = {b.couleur}")
    assert not fautes, "couleurs hors charte :\n  " + "\n  ".join(fautes[:12])


def test_no_migrated_card_lost_its_figure():
    """The migration defect a rendered proof caught, pinned so it cannot return.

    In the retired schema `chiffre` held the figure itself. Read as a boolean it
    became `true` and the number vanished, leaving « MILLIONS DE KILOMÈTRES
    CARRÉS » with nothing in front of it.
    """
    for dossier, deck in decks():
        for carte in deck["cartes"]:
            if carte.get("chiffre"):
                assert carte.get("titre", "").strip(), (
                    f"{dossier.name} carte {carte['rang']} : carte à chiffre sans titre — "
                    f"le nombre a été perdu à la migration")


def test_the_scrim_never_lightens_on_any_full_frame_card():
    """§4 — one scrim, monotone, on every card of the corpus that gets layout A.

    Composed over a flat grey so the row profile *is* the composited alpha: what
    varies along it comes from the scrim and from nothing else. A photograph's own
    variation would hide exactly the defect being looked for.

    This is the check that would have caught the three scrim faults of the session
    that wrote it — a centred radial, a banner plate cancelling the column scrim,
    and local reinforcement plates punched under individual blocks.
    """
    plat = Image.new("RGB", (3000, 4000), (200, 200, 200))
    fautes = []
    for dossier, deck in decks():
        for carte in deck["cartes"]:
            image = _image(dossier, carte)
            for fmt in FORMATS:
                if gab.plan(carte, deck, fmt, image=image).disposition != "A":
                    continue
                fond, _ = gab.fond_et_plan(carte, deck, fmt, image=plat,
                                           disposition="A")
                pixels = fond.convert("L").load()
                W, H = fond.size
                creux, pire = 255.0, 0.0
                for y in range(H):
                    ligne = sum(pixels[x, y] for x in range(0, W, 120)) / len(range(0, W, 120))
                    creux = min(creux, ligne)
                    pire = max(pire, ligne - creux)
                if pire > 25:
                    fautes.append(f"{dossier.name} {carte['rang']:02d} {fmt} : "
                                  f"la luminance remonte de {pire:.0f} niveaux")
    assert not fautes, "profil non monotone :\n  " + "\n  ".join(fautes[:10])


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failed = 0
    for t in tests:
        try:
            t()
        except Exception as e:  # noqa: BLE001 — a runner reports, it does not raise
            failed += 1
            print(f"FAIL  {t.__name__}\n      {e}", flush=True)
        else:
            print(f"ok    {t.__name__}", flush=True)
    print(f"\n{len(tests) - failed}/{len(tests)} passent", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
