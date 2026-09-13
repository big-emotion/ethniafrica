"""Checks that the render modules can no longer hold a style value of their own.

    ./venv/bin/python test_ethni_tokens.py

Plain assertions rather than pytest: the harness has no test dependency and adding
one to check a CSS parser would cost more than it buys.

The last assertion is the one that matters. It reads every module that draws a
published frame and fails on any hex literal left in them, which is the drift
that put a logo gold on text — `#FFD33D` on a parchment card, illegible.
"""
import pathlib
import re
import sys

import ethni_tokens as tk

HARNESS = pathlib.Path(__file__).resolve().parent


def test_colours_come_from_the_design_system():
    # The eight roles GABARITS-SOCIAL.md §2 names for the night theme.
    assert tk.color("--afh-night-ground") == "#120e0a"
    assert tk.color("--afh-night-ink") == "#f1e7d8"
    assert tk.color("--afh-night-ink-2") == "#c9b99f"
    assert tk.color("--afh-night-ink-3") == "#8f7f66"
    assert tk.color("--afh-night-ocre-soft") == "#e8b96a"
    assert tk.color("--afh-cat-teal") == "#33a390"
    assert tk.color("--afh-cat-terre-ink-night") == "#cd725e"
    assert tk.color("--afh-cat-perv") == "#7a8ce8"
    # Parchment.
    assert tk.color("--afh-color-bg") == "#fbf7f2"
    assert tk.color("--afh-color-text") == "#2c2018"


def test_var_indirection_resolves():
    # `--afh-cat-ocre-ink-night: var(--afh-cat-ocre)` — one hop, and the caller
    # must never see the hop.
    assert tk.color("--afh-cat-ocre-ink-night") == tk.color("--afh-cat-ocre")


def test_the_text_gold_is_not_the_logo_gold():
    """The defect this whole reset exists to prevent.

    `#f2ba36` is the lockup's gold and belongs to `ethni_brand.py`. Display text
    takes the soft ocre, which holds on both grounds.
    """
    assert tk.color("--afh-night-ocre-soft") != "#f2ba36"
    assert tk.accent("ocre", "nuit") == "#e8b96a"


def test_no_value_is_drawn_without_a_token():
    """Ruled 2026-09-10: the quarantine is empty and stays empty.

    A value with no charter token does not get drawn while somebody thinks about
    it. `#FFFFFF` became the charter's lightest ink; `#142B25` was deleted rather
    than tokenised, because the project already has a dark ground.
    """
    assert tk.SANS_JETON == {}, (
        "une valeur sans jeton ne se dessine pas — arbitre-la ou supprime-la : "
        f"{tk.SANS_JETON}")
    assert tk.palette()["white"] == "#f1e7d8"
    assert "green" not in tk.palette()
    assert tk.palette()["ground"] == "#120e0a"


def test_accent_maps_to_pillar_and_theme():
    # §2 — L'atlas → ocre · Les dossiers → teal · Jouer → pervenche.
    assert tk.accent_for_pillar("L'atlas") == "ocre"
    assert tk.accent_for_pillar("Les dossiers") == "teal"
    assert tk.accent_for_pillar("Jouer") == "perv"
    # The same accent resolves to a different ink per ground.
    assert tk.accent("teal", "nuit") == "#33a390"
    assert tk.accent("teal", "parchemin") == "#226d60"


def test_muted_ink_is_refused_for_credits():
    """§2 — `--afh-color-text-muted` fails AA at 19 px and may not carry a credit."""
    try:
        tk.credit_ink("parchemin", token="--afh-color-text-muted")
    except ValueError as e:
        assert "AA" in str(e) or "muted" in str(e)
    else:
        raise AssertionError("a muted credit ink must be refused, not returned")


def test_font_families_come_from_the_tokens():
    assert "Anton" in tk.font_family("social")
    assert "Nunito Sans" in tk.font_family("body")


def test_font_files_ship_with_the_engine():
    # They used to be read from a second copy beside the spec. One home, so a
    # face cannot be updated on one side and silently re-render the catalogue.
    for face in ("Anton-Regular.ttf", "NunitoSans.ttf", "Fraunces.ttf"):
        p = tk.font_file(face)
        assert p.exists(), f"{face} manquante sous {tk.FONTS}"
        assert p.parent == tk.FONTS, f"{face} ne vient pas du dossier du moteur"


def test_formats_come_from_the_spec():
    """§1 — three outputs, and LinkedIn is 1080 square, not 1200."""
    ig = tk.fmt("carrousel")
    assert (ig["w"], ig["h"], ig["k"]) == (1080, 1350, 1.00)
    li = tk.fmt("linkedin")
    assert (li["w"], li["h"]) == (1080, 1080)
    assert li["k"] == 0.86
    reel = tk.fmt("reel")
    assert (reel["w"], reel["h"], reel["k"]) == (1080, 1920, 1.08)
    assert reel["marge_basse"] == 391


def test_the_interface_floor_is_a_number_not_a_habit():
    """§1 — nothing legible below y = 1620 in 9:16."""
    assert tk.SAFE_FLOOR_9_16 == 1620


def test_type_roles_come_from_the_spec_and_scale_with_k():
    corps = tk.type_role("Corps")
    assert corps["corps"] == 32
    assert corps["interligne"] == 1.55
    assert corps["graisse"] == 400
    # A role is asked for at a format, and comes back multiplied by that k.
    assert tk.type_size("Corps", "linkedin") == round(32 * 0.86)
    assert tk.type_size("Corps", "carrousel") == 32


def test_the_body_is_at_least_one_and_six_tenths_of_the_credit():
    """§3's invariant, and it is a test rather than an intention.

    It ran the other way — body 30 against credit 31 — so the reader met the legal
    mention before the explanation. An annexe larger than what it annotates inverts
    the five ranks whatever the rest of the composition says.
    """
    corps = tk.type_role("Corps")["corps"]
    credit = tk.type_role("Crédit")["corps"]
    assert corps >= 1.6 * credit, f"corps {corps}, crédit {credit}"


def test_oversample_ceiling_and_layout_choice():
    """§6 — the rule the brief calls the most important of the lot."""
    assert tk.SUR_ECH_MAX == 2.0
    assert tk.CORPS_COURT == 90
    assert not hasattr(tk, "CORPS_LONG"), (
        "un plafond en signes n'est plus la règle : voir `colonne_A_tient`")

    # B is the word that carries, with one line to explain it.
    assert tk.choisir({"role": "ouverture", "corps": "Une ligne."},
                      w=3000, h=4000, fmt_key="carrousel") == "B"
    assert tk.choisir({"role": "ouverture", "corps": "x" * 91},
                      w=3000, h=4000, fmt_key="carrousel") == "A"
    # What B refuses is the pair.
    assert tk.choisir({"role": "ouverture", "corps": "Court.", "paires": [1, 2]},
                      w=3000, h=4000, fmt_key="carrousel") == "A"
    # A figure earns no cartouche on its own.
    assert tk.choisir({"role": "entree", "chiffre": "30,38", "corps": ""}, w=3000, h=4000, fmt_key="carrousel") == "A"
    # A series card on a big image stays A.
    assert tk.choisir({"role": "entree", "corps": "court"}, w=3000, h=4000, fmt_key="carrousel") == "A"

    # The fit is the engine's to measure, and §6 asks for it by callable.
    assert tk.choisir({"role": "entree", "corps": "court"}, w=3000, h=4000,
                      fmt_key="carrousel", tient=lambda: False) == "C"

    # §6's own worked example: 900 px wide, landscape, in a 1080 × 1920 frame.
    # Covering it means 1920/533 ≈ ×3.6, the number the spec quotes, so the card
    # falls back to C and the band respects the native resolution.
    assert tk.choisir({"role": "entree", "corps": "court"}, w=900, h=533, fmt_key="reel") == "C"

    # A portrait scan of the same width covers at ×1.6 and is still allowed —
    # the ceiling is on the enlargement, not on the pixel count.
    assert tk.choisir({"role": "entree", "corps": "court"}, w=900, h=1200, fmt_key="reel") == "A"


def test_output_licence_is_the_most_viral_of_the_lot():
    """§7 — computed, never copied."""
    assert tk.licence_sortie(["domaine public", "CC BY-SA 2.0"]) == "CC BY-SA 2.0"
    assert tk.licence_sortie(["CC BY-SA 3.0", "CC BY-SA 4.0"]) == "CC BY-SA 4.0"
    assert tk.licence_sortie(["domaine public", "domaine public"]) == "domaine public"
    # An unnamed licence is not a licence.
    assert tk.licence_sortie(["domaine public", "à nommer"]) is None


def test_internal_notes_never_reach_a_printed_field():
    """§7 and §11 — « licence à nommer » is a message to the operator."""
    assert tk.note_interne("licence à nommer")
    assert tk.note_interne("série à confirmer")
    assert tk.note_interne("crédit à compléter")
    assert not tk.note_interne("G. W. Bacon, Londres, v. 1906")


# The live path — cards through `ethni_carrousel2.py` → `ethni_compose.py`, video
# through `ethni_audio.py` → `ethni_montage.py` with `ethni_soustitre.py` — plus
# `ethni_render.py`, which still renders montages cut on the old gabarit. The gate
# used to read the retired carousel script instead, so it was guarding a file no
# render went through while the modules that did draw were never scanned.
RENDER_MODULES = (
    "ethni_carrousel2.py",
    "ethni_compose.py",
    "ethni_audio.py",
    "ethni_montage.py",
    "ethni_soustitre.py",
    "ethni_render.py",
)


def test_no_style_literal_survives_in_the_render_scripts():
    """The hard rule of the reset, enforced rather than promised."""
    hexes = re.compile(r"#[0-9A-Fa-f]{3,8}\b")
    offenders = []
    for name in RENDER_MODULES:
        source = (HARNESS / name).read_text(encoding="utf-8")
        # Strip docstrings and comments: a hex quoted in prose explaining the old
        # defect is documentation, and deleting the explanation would invite the
        # defect back.
        code = re.sub(r'"""(?:.|\n)*?"""',
                      lambda m: "\n" * m.group(0).count("\n"), source)
        code = re.sub(r"#(?![0-9A-Fa-f]{3,8}\b).*", "", code)
        for line_no, line in enumerate(code.splitlines(), 1):
            if hexes.search(line):
                offenders.append(f"{name}:{line_no}: {line.strip()}")
    assert not offenders, (
        "un littéral de couleur subsiste — il doit se lire dans tokens/colors.css :\n  "
        + "\n  ".join(offenders))


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
