"""Every planned block has to leave a mark on the finished image.

    ./venv/bin/python test_plan_vs_peint.py

The lockup was planned by nobody and painted by nobody for four chantiers, and no
test could see it: the plan said what should be there, the render said what was,
and nothing compared the two.

The comparison is crude on purpose. It does not check that a block is *correct* —
it checks that the pixels inside its box differ from the same box on the ground
without text. A block that was planned and never drawn leaves them identical, and
that is the failure being hunted.
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image

import ethni_compose as gab
from ethni_paths import productions_root


PROJETS = productions_root()
FORMATS = ("carrousel", "linkedin", "reel")

# Surfaces and scrims are not drawn by the text pass and are checked elsewhere.
NON_PEINTS = {"fond", "bande-image", "voile-bandeau", "voile-lisibilite",
              "voile-bande", "bande-sous-titre"}


def _decks(limite=3):
    for fichier in sorted(PROJETS.glob("*/cards.json"))[:limite]:
        deck = json.loads(fichier.read_text(encoding="utf-8"))
        if "cartes" in deck:
            yield fichier.parent, deck


def _a_laisse_une_trace(finie, fond, bloc):
    """Do the pixels under this block differ from the same box on the ground?"""
    boite = (max(0, bloc.x), max(0, bloc.y),
             min(finie.width, bloc.x + max(bloc.w, 1)),
             min(finie.height, bloc.y + max(bloc.h, 1)))
    if boite[2] <= boite[0] or boite[3] <= boite[1]:
        return False
    a = np.asarray(finie.convert("RGB").crop(boite), dtype=np.int16)
    b = np.asarray(fond.convert("RGB").crop(boite), dtype=np.int16)
    # A handful of pixels differing is antialiasing noise; a drawn block moves
    # thousands.
    return int(np.abs(a - b).sum()) > 5000


def test_no_planned_block_goes_unpainted():
    fautes = []
    for dossier, deck in _decks():
        for carte in deck["cartes"][:3]:
            image = Image.open(dossier / "assets" / carte["image"]["fichier"]).convert("RGB")
            for fmt in FORMATS:
                fond, plan = gab.fond_et_plan(carte, deck, fmt, image=image)
                finie = gab.composer(carte, deck, fmt, image=image)

                for bloc in plan.blocs:
                    if bloc.nom in NON_PEINTS:
                        continue
                    if bloc.texte == "" and bloc.nom not in ("filigrane", "appel-action"):
                        continue
                    if not _a_laisse_une_trace(finie, fond, bloc):
                        fautes.append(f"{dossier.name} carte {carte['rang']} {fmt} : "
                                      f"« {bloc.nom} » planifié, jamais peint")
    assert not fautes, "blocs fantômes :\n  " + "\n  ".join(sorted(set(fautes))[:12])


def test_the_watermark_is_among_them():
    """The block this test exists for. It was absent for four chantiers."""
    dossier, deck = next(iter(_decks(1)))
    carte = deck["cartes"][0]
    image = Image.open(dossier / "assets" / carte["image"]["fichier"]).convert("RGB")

    for fmt in FORMATS:
        fond, plan = gab.fond_et_plan(carte, deck, fmt, image=image)
        finie = gab.composer(carte, deck, fmt, image=image)
        marque = plan.bloc("filigrane")
        assert marque is not None, f"{fmt} : aucun filigrane au plan"
        assert _a_laisse_une_trace(finie, fond, marque), f"{fmt} : filigrane non peint"


def test_the_foot_sits_on_the_bottom_margin():
    """§0.2 — the foot is pinned; the central block is what compresses.

    Measured as the gap between the foot's lowest pixel and the bottom margin the
    format declares. It is zero, and it stays zero on every layout and format.
    """
    fautes = []
    for dossier, deck in _decks():
        for carte in deck["cartes"][:3]:
            image = Image.open(dossier / "assets" / carte["image"]["fichier"]).convert("RGB")
            for fmt in FORMATS:
                cadre = gab.tk.fmt(fmt)
                for disposition in ("A", "B", "C"):
                    p = gab.plan(dict(carte, disposition=disposition), deck, fmt,
                                 image=image)
                    # §7 bis — the watermark is the foot's last block now that it
                    # sits under the credit, so it is what lands on the margin.
                    pied = [b for b in p.blocs
                            if b.nom.startswith("credit") or b.nom == "filigrane"]
                    bas = max(b.y + b.h for b in pied)
                    attendu = cadre["h"] - cadre["marge_basse"]
                    if bas != attendu:
                        fautes.append(f"{dossier.name} {carte['rang']} {disposition}/{fmt} : "
                                      f"pied à {bas}, marge basse à {attendu}")
    assert not fautes, "pied non épinglé :\n  " + "\n  ".join(fautes[:10])


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
