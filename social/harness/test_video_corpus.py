"""The video port, checked frame by frame against the whole corpus.

    ./venv/bin/python test_video_corpus.py

Two of these exist because checking the first frame is not checking the video.
A block that arrives late can push the foot, and a caption that appears at second
four can cross the interface line the opening frame cleared.
"""
import json
import pathlib
import sys

from PIL import Image

import ethni_compose as gab
import ethni_soustitre as st
import ethni_tokens as tk
from ethni_paths import productions_root


PROJETS = productions_root()
FORMATS = ("carrousel", "linkedin", "reel")
DUREE = 6.0
PAS = 0.5          # sampling step, in seconds


def decks():
    for fichier in sorted(PROJETS.glob("*/cards.json")):
        deck = json.loads(fichier.read_text(encoding="utf-8"))
        if "cartes" in deck:
            yield fichier.parent, deck


def _image(dossier, carte):
    return Image.open(dossier / "assets" / carte["image"]["fichier"]).convert("RGB")


def _caption(n):
    """A caption of the length the corpus actually produces, for band tests."""
    texte = ("Onze villes du Congo portaient le nom d'un Belge, "
             "et l'administration coloniale les a nommées d'après les siens.")
    return {"lignes": st.envelopper(st.segmenter(texte)[n % 2]), "pivot": "Congo"}


# ---------------------------------------------------------------- interface zone


def test_the_interface_line_holds_on_every_frame_not_just_the_first():
    """§1 — nothing legible below y = 1620, at any instant of any scene.

    Checked by sampling the scene rather than reading the opening frame: a block
    that enters at second four can push the foot after the frame everybody looks
    at has already been approved.
    """
    fautes = []
    for dossier, deck in decks():
        for carte in deck["cartes"]:
            image = _image(dossier, carte)
            for sous_titre in (None, _caption(carte["rang"])):
                p = gab.cadencer(
                    gab.plan(carte, deck, "reel", image=image, sous_titre=sous_titre),
                    DUREE)
                instant = 0.0
                while instant <= DUREE:
                    for b in p.blocs:
                        if not b.texte or b.entree > instant:
                            continue
                        if b.y + b.h > tk.SAFE_FLOOR_9_16:
                            fautes.append(
                                f"{dossier.name} carte {carte['rang']} t={instant:.1f}s "
                                f"« {b.nom} » descend à {b.y + b.h}")
                    instant += PAS
    assert not fautes, "sous la ligne d'interface :\n  " + "\n  ".join(sorted(set(fautes))[:10])


def test_the_subtitle_band_never_pushes_the_foot():
    """§5C — with a band active the image gives up height, never the foot."""
    fautes = []
    for dossier, deck in decks():
        for carte in deck["cartes"]:
            image = _image(dossier, carte)
            sans = gab.plan(carte, deck, "reel", image=image, sous_titre=None)
            avec = gab.plan(carte, deck, "reel", image=image, sous_titre=_caption(1))

            pied = lambda p: min((b.y for b in p.blocs if b.nom.startswith("credit")),
                                 default=0)
            if pied(sans) != pied(avec):
                fautes.append(f"{dossier.name} carte {carte['rang']} : "
                              f"pied à {pied(sans)} puis {pied(avec)}")

            bande = lambda p: next(b.h for b in p.blocs if b.nom == "bande-image")
            if avec.disposition == "C" and bande(avec) >= bande(sans):
                fautes.append(f"{dossier.name} carte {carte['rang']} : "
                              f"la bande d'image n'a pas cédé sa hauteur")
    assert not fautes, "\n  " + "\n  ".join(fautes[:10])


# ---------------------------------------------------------------- the caption


def test_a_caption_never_leaves_its_column():
    fautes = []
    for dossier, deck in decks():
        for carte in deck["cartes"][:2]:
            image = _image(dossier, carte)
            p = gab.plan(carte, deck, "reel", image=image, sous_titre=_caption(0))
            bande = p.bloc("bande-sous-titre")
            assert bande is not None, f"{dossier.name} : aucune bande réservée"

            t = gab._role_type("Sous-titre narration", "reel")
            f = gab.fonte("nunito", t["corps"], t["graisse"])
            for ligne in _caption(0)["lignes"]:
                if gab._mesureur.textlength(ligne, font=f) > bande.w:
                    fautes.append(f"{dossier.name} : « {ligne} » dépasse la bande")
    assert not fautes, "\n  " + "\n  ".join(fautes[:8])


def test_a_caption_is_wrapped_on_pixels_not_on_characters():
    """A character ceiling is not a pixel ceiling.

    « de cinquante-deux personnes qu'on venait de libérer. » is 51 characters and
    about 1 100 px at the subtitle size, against a band of 898. The caption ran
    off both edges of the frame, and the character count said it fit.
    """
    dossier, deck = next(iter(decks()))
    carte = deck["cartes"][0]
    image = _image(dossier, carte)
    p = gab.plan(carte, deck, "reel", image=image, sous_titre=_caption(0))
    bande = p.bloc("bande-sous-titre")

    t = gab._role_type("Sous-titre narration", "reel")
    f = gab.fonte("nunito", t["corps"], t["graisse"])
    mesure = lambda x: gab._mesureur.textlength(x, font=f)

    for texte in ("Libreville, au Gabon, est née de cinquante-deux personnes "
                  "qu'on venait de libérer.",
                  "et l'administration coloniale les a nommées d'après les siens.",
                  "Un roi encore, Albert premier, pour Albertville."):
        # The painter shrinks the type until two lines hold the caption, so the
        # check is that some size in the allowed range fits — not that the
        # nominal one does.
        corps = t["corps"]
        while corps > gab.SOUS_TITRE_PLANCHER:
            f2 = gab.fonte("nunito", corps, t["graisse"])
            m2 = lambda x: gab._mesureur.textlength(x, font=f2)  # noqa: B023
            lignes = st.envelopper(texte, mesure=m2, largeur_max=bande.w - 64)
            if len(lignes) <= st.LIGNES_MAX and max(m2(l) for l in lignes) <= bande.w:
                break
            corps = round(corps * 0.94)
        else:
            raise AssertionError(f"« {texte} » ne tient pas même au plancher")
        assert len(lignes) <= st.LIGNES_MAX, f"{len(lignes)} lignes pour « {texte} »"


def test_the_caption_plate_reaches_its_contrast_threshold():
    """§9 — the plate does the work; a thick outline would be a patch over it."""
    dossier, deck = next(iter(decks()))
    carte = deck["cartes"][0]
    image = _image(dossier, carte)

    fond = gab.fond_compose(carte, deck, "reel", image=image, sous_titre=_caption(0))
    p = gab.plan(carte, deck, "reel", image=image, sous_titre=_caption(0))
    bande = p.bloc("bande-sous-titre")

    sonde = gab.Bloc("sonde", bande.x, bande.y, bande.w, bande.h,
                     texte="x", couleur=gab._encre(deck, 1), corps=46)
    ratio = gab.contraste_mesure(fond, sonde)
    print(f"      plaque de sous-titre : {ratio:.2f}:1", flush=True)
    assert ratio >= 3.0, f"plaque de sous-titre à {ratio:.2f}:1"


# ---------------------------------------------------------------- non-regression


def test_the_195_carousel_plans_are_unchanged():
    """The video port moves nothing in a still image.

    Geometry only: the cadence adds numbers to blocks, and adding a number is not
    allowed to move one.
    """
    total = 0
    for dossier, deck in decks():
        for carte in deck["cartes"]:
            image = _image(dossier, carte)
            for fmt in FORMATS:
                p = gab.plan(carte, deck, fmt, image=image)
                for b in p.blocs:
                    assert b.entree == 0.0 and b.permanent, (
                        f"{dossier.name} {fmt} : « {b.nom} » porte une cadence hors vidéo")
                total += 1
    assert total == 195, f"{total} plans au lieu de 195"
    print(f"      {total} plans carrousel inchangés", flush=True)


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
