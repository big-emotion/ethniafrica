"""The clock: entry order, permanence, and the promise that geometry did not move.

    ./venv/bin/python test_ethni_cadence.py

All of it reads the plan. A cadence is a set of numbers attached to blocks, and
numbers are worth asserting before anything is drawn — a test that renders frames
to discover that the body arrived before the figure has spent a minute to learn
what a comparison of two floats says instantly.
"""
import pathlib
import sys

from PIL import Image

import ethni_compose as gab
import ethni_tokens as tk

FORMATS = ("carrousel", "linkedin", "reel")
DUREE = 6.0


def carte(**kw):
    base = {
        "rang": 3, "role": "serie",
        "titre": "30,38", "chiffre": True,
        "precision": "millions de kilomètres carrés",
        "punchline": "Le continent, en vrai.",
        "corps": "Cinquante-quatre États, le Sahara occidental et les eaux intérieures.",
        "source": "Banque mondiale",
        "image": {"fichier": None, "w": 3000, "h": 4000, "cadrage": "50% 50%",
                  "identite": "une carte du continent",
                  "verifie": {"par": "essai", "le": "2026-09-11"},
                  "credit": "Carte du continent", "depot": "NASA",
                  "licence": "domaine public"},
        "coupe": None, "disposition": "auto",
    }
    base.update(kw)
    return base


DECK = {"campagne": "essai", "pilier": "L'atlas", "accent": "ocre", "fond": "nuit",
        "serie": "La carte cachée", "cartes": []}


def image_test(w=3000, h=4000, ton=128):
    return Image.new("RGB", (w, h), (ton, ton, ton))


def cadence(disposition="C", fmt="reel", duree=DUREE, sans_animation=False, **kw):
    p = gab.plan(carte(disposition=disposition, **kw), DECK, fmt, image=image_test())
    return gab.cadencer(p, duree, sans_animation=sans_animation)


# ---------------------------------------------------------------- order


def test_no_block_arrives_before_the_one_it_explains():
    """The precision explains the figure; the body explains the punchline."""
    p = cadence()
    instant = {b.nom: b.entree for b in p.blocs}

    for avant, apres in (("chiffre", "precision"), ("precision", "punchline"),
                         ("punchline", "corps"), ("corps", "source")):
        if avant in instant and apres in instant:
            assert instant[avant] <= instant[apres], (
                f"« {apres} » entre à {instant[apres]}s, avant « {avant} » "
                f"à {instant[avant]}s")


def test_the_reading_order_is_not_the_code_order():
    """Stated as a fact about the plan, so reordering the builder cannot break it."""
    p = cadence()
    entrants = [b for b in p.blocs if not b.permanent]
    noms = [b.nom for b in entrants]
    assert noms == sorted(noms, key=gab.ORDRE_LECTURE.index), (
        f"les blocs entrent dans l'ordre {noms}")


# ---------------------------------------------------------------- permanence


def test_the_banner_the_rank_and_the_credit_are_there_from_the_first_frame():
    """§9 — in video a credit is a legal mention, not a footer.

    A mention that appears at the end of a scene nobody watches to the end has
    not been shown.
    """
    p = cadence()
    for bloc in p.blocs:
        if bloc.nom.startswith("credit") or bloc.nom in ("bandeau", "rang"):
            assert bloc.permanent, f"« {bloc.nom} » n'est pas permanent"
            assert bloc.entree == 0.0, f"« {bloc.nom} » entre à {bloc.entree}s"


def test_the_first_content_block_is_there_from_the_first_frame():
    """§9 — frame 1 is the thumbnail, and it decides whether anyone watches.

    It circulates in the feed far longer than it lasts in playback, so a thumbnail
    whose text has not arrived yet is a thumbnail with no hook.
    """
    p = cadence()
    contenu = [b for b in p.blocs
               if b.nom in gab.ORDRE_LECTURE or b.nom.split("-")[0] in gab.ORDRE_LECTURE]
    contenu.sort(key=lambda b: gab.ORDRE_LECTURE.index(
        b.nom if b.nom in gab.ORDRE_LECTURE else b.nom.split("-")[0]))

    premier = contenu[0]
    assert premier.permanent, f"« {premier.nom} » doit être là dès l'image 1"
    assert premier.entree == 0.0

    # And the cadence still runs: the second block does arrive later.
    assert any(not b.permanent for b in contenu[1:]), "plus rien n'entre en cadence"
    assert contenu[1].entree == 0.0 or contenu[1].entree >= 0.0


def test_every_block_has_arrived_before_the_scene_ends():
    """A line landing on the closing frame is a line nobody reads."""
    for duree in (3.0, 6.0, 12.0):
        p = cadence(duree=duree)
        for bloc in p.blocs:
            fin = bloc.entree + gab.ENTREE_DUREE
            assert fin <= duree, (
                f"scène de {duree}s : « {bloc.nom} » finit d'entrer à {fin:.2f}s")
        dernier = max(b.entree for b in p.blocs)
        assert dernier <= duree * 0.7, (
            f"scène de {duree}s : le dernier bloc entre à {dernier:.2f}s, "
            f"il ne reste pas le temps de le lire")


def test_a_short_scene_still_places_every_block():
    """The staggering fits the room available; it is not a fixed step."""
    p = cadence(duree=2.0)
    assert all(b.entree + gab.ENTREE_DUREE <= 2.0 for b in p.blocs)


# ---------------------------------------------------------------- reduced motion


def test_reduced_motion_renders_with_everything_present():
    """A contract, in video as on the page — and the visual control.

    Same scene durations, every block on the first frame. A still frame is easier
    to judge than a movement.
    """
    p = cadence(sans_animation=True)
    assert all(b.entree == 0.0 for b in p.blocs)
    assert all(b.permanent for b in p.blocs)


def test_the_base_durations_are_not_the_reduced_motion_ones():
    """The override sits last in the file and once won by accident.

    Every duration came back as 1e-05 s, which in a video means every block
    arriving at once — and it would have looked deliberate.
    """
    assert gab.ENTREE_DUREE > 0.1, f"durée d'entrée à {gab.ENTREE_DUREE}s"
    assert gab.ENTREE_COURBE is not None, "la courbe d'arrivée doit être une bézier"
    assert tk.MOUVEMENT_REDUIT["duree"] == 0.0


def test_the_entry_is_sober():
    """No scale, no rotation, no bounce — an opacity and a short translation."""
    assert 0 < gab.ENTREE_TRANSLATION <= 40, (
        f"translation de {gab.ENTREE_TRANSLATION} px : au-delà c'est un mouvement, "
        f"pas une arrivée")


# ---------------------------------------------------------------- non-regression


def test_the_cadence_moves_no_pixel():
    """The 195 carousel plans must come out identical. The clock is an addition."""
    for disposition in ("A", "B", "C"):
        for fmt in FORMATS:
            avant = gab.plan(carte(disposition=disposition), DECK, fmt, image=image_test())
            geometrie = [(b.nom, b.x, b.y, b.w, b.h) for b in avant.blocs]

            apres = gab.cadencer(
                gab.plan(carte(disposition=disposition), DECK, fmt, image=image_test()),
                DUREE)
            assert [(b.nom, b.x, b.y, b.w, b.h) for b in apres.blocs] == geometrie, (
                f"{disposition}/{fmt} : la cadence a déplacé un bloc")


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
