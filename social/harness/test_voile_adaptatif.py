"""§4 — the scrim is measured against its image, not set to a worst-case constant.

    ./venv/bin/python test_voile_adaptatif.py

Two defects are pinned here, both found on the Dioula carousel of 2026-09-12.

**The scrim was sized for a document nobody publishes.** The alpha table of §4 is
calibrated on the palest engraving of the corpus, luminance 0,985. Applied as a
constant to a dark 1892 photograph it measured 9,26:1 where the rule asks 4,5:1 —
five points of contrast spent darkening a photograph that was already dark, and
the picture disappeared behind its own caption.

**A banded card had no photograph behind its text at all.** Measured on card 06:
from 36 % of the height down, the horizontal variation of the background was
0,00 — a pure flat. Lowering an alpha there changes nothing, because there is
nothing underneath. The fix is structural: the image goes full frame and the text
sits under the same scrim as everywhere else.

Every assertion measures the rendered pixels. Composed over a flat tone, a row's
luminance *is* the composited alpha, so what it reports comes from the scrim and
from nothing else.
"""
import pathlib
import sys

import numpy as np
from PIL import Image

import ethni_compose as gab
import ethni_tokens as tk

HARNESS = pathlib.Path(__file__).resolve().parent
FORMATS = ("carrousel", "linkedin", "reel")

# §4 — the bounds the adaptive rule may never leave.
PLANCHER, PLAFOND = 0.55, 0.95
BASE = 14.0          # the ground #120e0a reads at luminance 14


def carte(**kw):
    base = {
        "rang": 2, "role": "serie",
        "titre": "Un nom de métier devenu un nom de peuple",
        "chiffre": False, "precision": "", "punchline": "",
        "corps": "Jula veut dire marchand ambulant, en mandingue. Le mot disait "
                 "un métier, pas une origine.",
        "source": "Fiche Dioula · Ethnologue",
        "image": {"fichier": "x.jpg", "w": 4000, "h": 5000, "cadrage": "50% 50%",
                  "identite": "un marché de plein air adossé à un mur de terre",
                  "verifie": {"par": "test", "le": "2026-09-12"},
                  "credit": "Marché (Kong) · Marcel Monnier · 1892",
                  "depot": "BnF", "licence": "domaine public"},
        "paires": None, "pivot": None, "titre_camps": None, "coupe": None,
        "disposition": "auto",
    }
    base.update(kw)
    return base


DECK = {"campagne": "essai", "pilier": "La carte cachée", "accent": "ocre",
        "fond": "nuit", "licence_sortie": "domaine public", "cartes": [carte()]}


def plat(ton, w=3000, h=4000):
    """A uniform image: the row profile of a render over it is the alpha itself."""
    return Image.new("RGB", (w, h), (ton, ton, ton))


def alpha_sous(fond, y, ton):
    """Recover the composited alpha at row `y` from a render over a flat tone."""
    ligne = np.asarray(fond.convert("L"), dtype=float)[y].mean()
    return max(0.0, min(1.0, (ton - ligne) / (ton - BASE)))


def blocs_contenu(p):
    """The argument's own blocks — title, body, source, credit.

    The banner and the rank are excluded on purpose. On a banded layout they sit
    at the very top under their own plate, so a probe that takes the topmost text
    block measures the plate and never the scrim. That mistake made two of these
    tests pass against the very defect they were written for.
    """
    return [b for b in p.blocs
            if b.texte and not b.nom.startswith("entete-") and b.nom != "defilement"]


def alpha_du_texte(carte_, fmt, ton, disposition=None):
    """The alpha actually composited over the topmost block of content."""
    fond, p = gab.fond_et_plan(carte_, DECK, fmt, image=plat(ton),
                               disposition=disposition)
    contenu = blocs_contenu(p)
    assert contenu, "aucun bloc de contenu"
    y = min(b.y + b.h // 2 for b in contenu)
    return alpha_sous(fond, min(y, fond.height - 1), ton)


def alpha_du_plat(carte_, fmt, ton, disposition=None):
    """The flat's own alpha, read deep below the ramp.

    The bounds and the ordering are properties of the flat. Probing the topmost
    block instead reads wherever the ramp happens to be under it, which is lower
    by design and made a correct scrim look as though it had broken its floor.
    """
    fond, _ = gab.fond_et_plan(carte_, DECK, fmt, image=plat(ton),
                               disposition=disposition)
    return alpha_sous(fond, int(fond.height * 0.95), ton)


# ── the adaptive rule ────────────────────────────────────────────────────────

def test_the_scrim_lightens_on_a_dark_photograph():
    """A dark image needs far less scrim, and must be given far less.

    This is the defect itself: at a constant 0,92 the Dioula lot measured 9,26:1
    against a 4,5:1 requirement, and the photograph was lost for nothing.
    """
    for fmt in FORMATS:
        a = alpha_du_plat(carte(), fmt, ton=40, disposition="A")
        assert a < 0.80, (f"{fmt} : voile à {a:.2f} sur une image sombre — "
                          f"la constante de 0,92 n'a pas été remplacée")


def test_the_scrim_stays_heavier_on_a_pale_engraving():
    """The lighter scrim may never cost the pale documents their legibility.

    Stated as a comparison and a floor, not as §4's tabulated 0,88. That table is
    a worst case computed on paper; measured, a solved 0,78 already clears every
    threshold over a near-white ground with margin to spare. Asserting the table's
    figure here would test the old constant rather than the new rule — and the
    guarantee that actually matters is the contrast one below.
    """
    for fmt in FORMATS:
        pale = alpha_du_plat(carte(), fmt, ton=250, disposition="A")
        sombre = alpha_du_plat(carte(), fmt, ton=40, disposition="A")
        assert pale >= 0.70, f"{fmt} : voile à {pale:.2f} sur une gravure pâle"
        assert pale > sombre + 0.05, (
            f"{fmt} : la gravure pâle ({pale:.2f}) n'est pas plus couverte que "
            f"la photographie sombre ({sombre:.2f}) — le voile ne s'adapte pas")


def test_the_scrim_follows_the_image_monotonically():
    """Darker image, lighter scrim — with no inversion anywhere in between."""
    for fmt in FORMATS:
        suite = [alpha_du_plat(carte(), fmt, ton=t, disposition="A")
                 for t in (30, 90, 150, 210, 255)]
        # The floor flattens the dark end, so equality there is the rule working,
        # not an inversion. Only a real climb back down is a fault.
        for gauche, droite in zip(suite, suite[1:]):
            assert droite >= gauche - 0.02, (
                f"{fmt} : le voile s'allège quand l'image s'éclaircit — "
                f"{[round(a, 3) for a in suite]}")


def test_the_alpha_never_leaves_its_bounds():
    for fmt in FORMATS:
        # Tones stay above the ground's own luminance: below it the recovered
        # alpha is a division by a negative and means nothing.
        for ton in (40, 90, 128, 247, 255):
            a = alpha_du_plat(carte(), fmt, ton=ton, disposition="A")
            assert PLANCHER - 0.01 <= a <= PLAFOND + 0.01, (
                f"{fmt} ton {ton} : alpha {a:.2f} hors des bornes "
                f"[{PLANCHER}, {PLAFOND}]")


def test_every_block_still_reaches_its_threshold():
    """The whole point of lightening: it may not cost one block its contrast.

    Measured on the scrim-only ground, never on the finished card: a large Anton
    title fills most of its own box, so sampling the glyphs drags the ratio toward
    1:1 and the check quietly stops meaning anything.
    """
    fautes = []
    for fmt in FORMATS:
        for ton in (20, 128, 255):
            fond, p = gab.fond_et_plan(carte(), DECK, fmt, image=plat(ton),
                                       disposition="A")
            for b in p.blocs:
                if b.nom in gab._NON_PEINTS or not getattr(b, "couleur", None):
                    continue
                seuil = 3.0 if b.nom in ("titre", "punchline", "chiffre") else 4.5
                r = gab.contraste_mesure(fond, b)
                if r < seuil:
                    fautes.append(f"{fmt} ton {ton} {b.nom} : {r:.2f}:1 < {seuil}")
    assert not fautes, "sous le seuil :\n  " + "\n  ".join(fautes[:10])


# ── the banded layouts ───────────────────────────────────────────────────────

def test_a_banded_card_shows_the_photograph_behind_its_text():
    """The defect the operator reported, in the form it was measured.

    A cartouche and a full-frame word used to crop the image to a band and lay
    the text on the card's own ground. The background under the text was a pure
    flat: horizontal variation 0,00 over the whole lower two thirds. Nothing an
    opacity could reveal, because nothing was there.

    Composed over a photograph with real horizontal structure, so a flat panel and
    a scrimmed image are told apart by the variation alone.
    """
    motif = np.tile(np.linspace(20, 240, 3000, dtype=np.uint8), (4000, 1))
    image = Image.fromarray(np.dstack([motif] * 3), "RGB")
    fautes = []
    for disposition in ("B", "C"):
        for fmt in FORMATS:
            fond, p = gab.fond_et_plan(carte(), DECK, fmt, image=image,
                                       disposition=disposition)
            contenu = blocs_contenu(p)
            y = min(b.y + b.h // 2 for b in contenu)
            ligne = np.asarray(fond.convert("L"), dtype=float)[
                min(y, fond.height - 1)]
            if ligne.std() < 2.0:
                fautes.append(f"{disposition} {fmt} : fond plat sous le texte "
                              f"(variation {ligne.std():.2f}) — aucune photo dessous")
    assert not fautes, "\n  " + "\n  ".join(fautes)


def test_a_banded_card_carries_the_image_to_the_full_frame():
    """The image block covers the card, so there is something to see through."""
    for disposition in ("B", "C"):
        for fmt in FORMATS:
            H = tk.fmt(fmt)["h"]
            p = gab.plan(carte(), DECK, fmt, image=plat(128),
                         disposition=disposition)
            bande = p.bloc("bande-image")
            assert bande is not None and bande.h >= H - 1, (
                f"{disposition} {fmt} : l'image ne couvre que {bande.h}/{H} px")


def test_no_text_lives_in_the_bright_gap():
    """§4's video exception, and the condition that replaces monotonicity.

    A plate at the top and a scrim at the bottom leave the image bright between
    them. That is licit only while no text falls in the gap — which is the whole
    reason the profile may stop being monotone.
    """
    fautes = []
    for disposition in ("B", "C"):
        for fmt in FORMATS:
            fond, p = gab.fond_et_plan(carte(), DECK, fmt, image=plat(240),
                                       disposition=disposition)
            for b in p.blocs:
                if not b.texte or not getattr(b, "couleur", None):
                    continue
                a = alpha_sous(fond, min(b.y + b.h // 2, fond.height - 1), 240)
                if a < PLANCHER - 0.01:
                    fautes.append(f"{disposition} {fmt} {b.nom} : alpha {a:.2f} "
                                  f"— le bloc tombe dans la trouée claire")
    assert not fautes, "\n  " + "\n  ".join(fautes[:10])


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
