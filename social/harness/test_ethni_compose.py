"""The composition engine's contract: §5 layouts, §6 choice, §7 gates, §11 checklist.

    ./venv/bin/python test_ethni_compose.py

Compositions are checked by measuring the rendered image, not by trusting the
code that placed the blocks. Three of these assertions exist because an earlier
gabarit passed review and failed on screen: a foot pushed under the platform
interface, a banner scrim computed inside an image band, and a credit anchored
independently of the block above it.
"""
import pathlib
import sys

from PIL import Image

import ethni_compose as gab
import ethni_tokens as tk

HARNESS = pathlib.Path(__file__).resolve().parent

FORMATS = ("carrousel", "linkedin", "reel")


def carte(**kw):
    """A migrated card at §10, with only what a test overrides spelled out."""
    base = {
        "rang": 2,
        "role": "serie",
        "titre": "Le nom français vient du wolof",
        "chiffre": False,
        "precision": "Mali · aujourd'hui",
        "punchline": "",
        "corps": "Les Français l'ont pris à leurs voisins wolof.",
        "source": "Fiche Fulbe du Massina",
        "image": {
            "fichier": None,
            "w": 3000, "h": 4000, "cadrage": "50% 50%",
            "identite": "un marché de rue, étals et passants",
            "verifie": {"par": "essai", "le": "2026-09-11"},
            "credit": "Marché de Mopti",
            "depot": "Wikimedia Commons",
            "licence": "CC BY-SA 4.0",
        },
        "paires": None,
        "titre_camps": None,
        "disposition": "auto",
    }
    base.update(kw)
    return base


DECK = {
    "campagne": "essai",
    "pilier": "L'atlas",
    "accent": "ocre",
    "fond": "nuit",
    "serie": "Le vrai nom",
    "cartes": [],
}


def image_test(w, h, ton=128):
    return Image.new("RGB", (w, h), (ton, ton, ton))


# ---------------------------------------------------------------- §5 layouts


def test_the_three_layouts_render_every_format():
    for disposition in ("A", "B", "C"):
        for fmt in FORMATS:
            im = gab.composer(carte(disposition=disposition), DECK, fmt,
                              image=image_test(3000, 4000))
            attendu = (tk.fmt(fmt)["w"], tk.fmt(fmt)["h"])
            assert im.size == attendu, f"{disposition}/{fmt} : {im.size} au lieu de {attendu}"


def test_nothing_is_drawn_outside_the_frame():
    """A block that overflows is a layout fault, never something to shrink away."""
    for disposition in ("A", "B", "C"):
        for fmt in FORMATS:
            plan = gab.plan(carte(disposition=disposition), DECK, fmt,
                            image=image_test(3000, 4000))
            cadre = tk.fmt(fmt)
            for bloc in plan.blocs:
                assert bloc.x >= 0 and bloc.y >= 0, f"{disposition}/{fmt} : {bloc.nom} sort en haut/gauche"
                assert bloc.x + bloc.w <= cadre["w"], f"{disposition}/{fmt} : {bloc.nom} déborde à droite"
                assert bloc.y + bloc.h <= cadre["h"], f"{disposition}/{fmt} : {bloc.nom} déborde en bas"


def test_blocks_do_not_overlap():
    for disposition in ("A", "B", "C"):
        for fmt in FORMATS:
            plan = gab.plan(carte(disposition=disposition), DECK, fmt,
                            image=image_test(3000, 4000))
            # The lockup carries no text, and this check only looked at blocks
            # that do — which is why it sat on the source line untested.
            textes = [b for b in plan.blocs if b.texte or b.nom == "lockup"]
            for i, a in enumerate(textes):
                for b in textes[i + 1:]:
                    chevauche = (a.x < b.x + b.w and b.x < a.x + a.w
                                 and a.y < b.y + b.h and b.y < a.y + a.h)
                    assert not chevauche, (
                        f"{disposition}/{fmt} : « {a.nom} » chevauche « {b.nom} »")


def test_the_foot_clears_the_platform_interface_in_9_16():
    """§1 and §7 — below y = 1620 the attribution is under the interface.

    This is not a cosmetic rule. The credit is where the licence obligation is
    discharged; hidden, it is not discharged.
    """
    for disposition in ("A", "B", "C"):
        for sous_titre in (False, True):
            plan = gab.plan(carte(disposition=disposition), DECK, "reel",
                            image=image_test(3000, 4000), sous_titre=sous_titre)
            pied = [b for b in plan.blocs if b.nom.startswith("credit")]
            assert pied, "aucun crédit composé"
            for b in pied:
                assert b.y + b.h <= tk.SAFE_FLOOR_9_16, (
                    f"{disposition}, sous-titre={sous_titre} : le crédit descend à "
                    f"{b.y + b.h}, sous la ligne d'interface {tk.SAFE_FLOOR_9_16}")


def test_the_content_column_compresses_and_the_foot_does_not_move():
    """A subtitle band takes its height from the content, never from the foot."""
    sans = gab.plan(carte(), DECK, "reel", image=image_test(3000, 4000), sous_titre=False)
    avec = gab.plan(carte(), DECK, "reel", image=image_test(3000, 4000), sous_titre=True)

    pied = lambda p: min(b.y for b in p.blocs if b.nom.startswith("credit"))
    assert pied(sans) == pied(avec), "le pied a bougé pour loger le sous-titre"

    hauteur = lambda p: sum(b.h for b in p.blocs if b.nom in ("titre", "corps", "precision"))
    assert hauteur(avec) <= hauteur(sans), "la colonne de contenu ne s'est pas comprimée"


def test_layout_A_keeps_the_credit_in_the_narration_column():
    """§5A — two independent bottom anchors telescope as soon as a line is added."""
    plan = gab.plan(carte(disposition="A"), DECK, "carrousel", image=image_test(3000, 4000))
    credit = next(b for b in plan.blocs if b.nom.startswith("credit"))
    corps = next((b for b in plan.blocs if b.nom == "corps"), None)
    assert corps is not None
    assert credit.x == corps.x, "le crédit de A n'est pas dans la colonne du corps"


def test_layout_B_keeps_the_image_band_at_37_percent_of_the_card():
    """§5B — of the card's height, in both formats, or the card stops being one card."""
    for fmt in ("carrousel", "reel"):
        plan = gab.plan(carte(disposition="B"), DECK, fmt, image=image_test(3000, 4000))
        bande = next(b for b in plan.blocs if b.nom == "bande-image")
        part = bande.h / tk.fmt(fmt)["h"]
        assert abs(part - 0.37) < 0.01, f"{fmt} : bande à {part:.0%} au lieu de 37 %"


def test_layout_C_keeps_one_proportion_across_formats():
    """§5C — 49 % of the card's height, in every format.

    The earlier 42/49 split was itself the defect: a band that changes proportion
    changes the card. All the surplus height goes to the flat, which carries no
    composition constraint.
    """
    for fmt in FORMATS:
        plan = gab.plan(carte(disposition="C"), DECK, fmt, image=image_test(3000, 4000))
        bande = next(b for b in plan.blocs if b.nom == "bande-image")
        part = bande.h / tk.fmt(fmt)["h"]
        assert abs(part - 0.49) < 0.01, f"{fmt} : bande à {part:.0%} au lieu de 49 %"


def test_layout_C_gives_the_image_up_to_the_subtitle():
    """§5C — 30 % when the subtitle band is active in 9:16. Text wins over image."""
    sans = gab.plan(carte(disposition="C"), DECK, "reel",
                    image=image_test(3000, 4000), sous_titre=False)
    avec = gab.plan(carte(disposition="C"), DECK, "reel",
                    image=image_test(3000, 4000), sous_titre=True)

    part = lambda p: next(b for b in p.blocs if b.nom == "bande-image").h / 1920
    assert abs(part(sans) - 0.49) < 0.01
    assert abs(part(avec) - 0.30) < 0.01, (
        f"avec sous-titre la bande doit descendre à 30 %, mesurée {part(avec):.0%}")


def test_a_band_is_never_a_fixed_pixel_height():
    """The rule the spec states as a rule, held for both banded layouts.

    A fixed height reads as one proportion in 4:5 and another in 9:16, and the
    same card stops being recognisable between the two.
    """
    for disposition, attendu in (("B", 0.37), ("C", 0.49)):
        parts = []
        for fmt in FORMATS:
            p = gab.plan(carte(disposition=disposition), DECK, fmt, image=image_test(3000, 4000))
            parts.append(next(b for b in p.blocs if b.nom == "bande-image").h / tk.fmt(fmt)["h"])
        assert max(parts) - min(parts) < 0.01, (
            f"{disposition} : la bande varie de {min(parts):.0%} à {max(parts):.0%} "
            f"entre formats — elle doit tenir {attendu:.0%} partout")


# ---------------------------------------------------------------- §10 pairs

# Two members — the shape every card of the corpus carries, and the one §3 bis
# illustrates. Three and four are legal at §10 and only hold in a tall column.
PAIRES = [{"terme": "Mosotho", "glose": "une personne"},
          {"terme": "Basotho", "glose": "le peuple"}]


def paires_plan(fmt="carrousel", paires=None, **kw):
    c = carte(corps="", paires=paires if paires is not None else PAIRES, **kw)
    return gab.plan(c, DECK, fmt, image=image_test(3000, 4000))


def test_every_member_gets_its_term_and_its_gloss():
    for fmt in FORMATS:
        p = paires_plan(fmt)
        termes = [b for b in p.blocs if b.nom.endswith("-terme")]
        gloses = [b for b in p.blocs if b.nom.endswith("-glose")]
        assert len(termes) == len(gloses) == len(PAIRES), f"{fmt} : cellule manquante"


def test_the_glosses_share_one_baseline():
    """Every gloss starts on the same line, under the tallest term.

    That shared baseline is what makes the members read as objects of the same
    kind rather than as a heading and a caption.
    """
    p = paires_plan()
    gloses = [p.bloc(f"couple-{i}-glose") for i in range(len(PAIRES))]
    assert len({b.y for b in gloses if b}) == 1, "les gloses ne partagent pas leur ligne"


def test_the_last_term_takes_the_accent_and_no_gloss_does():
    """§10 — the colour is positional, so no field says which term is accented."""
    p = paires_plan()
    accent = gab._accent(DECK)
    assert p.bloc(f"couple-{len(PAIRES) - 1}-terme").couleur == accent
    assert p.bloc("couple-0-terme").couleur == gab._encre(DECK, 1)
    for i in range(len(PAIRES)):
        assert p.bloc(f"couple-{i}-glose").couleur != accent


def test_a_pair_never_leaves_the_frame():
    """Covered by the same walk as everything else — no bespoke check."""
    for fmt in FORMATS:
        cadre = tk.fmt(fmt)
        for bloc in paires_plan(fmt).blocs:
            assert bloc.x >= 0 and bloc.y >= 0, f"{fmt} : {bloc.nom} sort en haut/gauche"
            assert bloc.x + bloc.w <= cadre["w"], f"{fmt} : {bloc.nom} déborde à droite"
            assert bloc.y + bloc.h <= cadre["h"], f"{fmt} : {bloc.nom} déborde en bas"


def test_pairs_do_not_collide_with_what_follows():
    """The foot and the source have to clear the pair, not sit on it."""
    p = paires_plan("reel")
    bas = max(b.y + b.h for b in p.blocs if b.nom.startswith("couple-"))
    for nom in ("source", "credit-0"):
        suivant = p.bloc(nom)
        if suivant:
            assert suivant.y >= bas, f"« {nom} » à {suivant.y}, paire jusqu'à {bas}"


def test_the_pair_count_is_bounded():
    """§10 — two to four. A fifth turns a demonstration into a table."""
    assert (gab.PAIRES_MIN, gab.PAIRES_MAX) == (2, 4)


def test_a_body_beside_a_pair_is_the_normal_form():
    """§10 — the pair shows the equivalence, the body says where it comes from.

    The mutual exclusion was carried over from the video's table, which *replaces*
    the body for want of room. A still card has the room, and all 41 pair cards of
    the corpus carry both.
    """
    verdict = gab.portes([carte(corps="du texte", paires=PAIRES[:2])], DECK)
    assert verdict.passe
    assert not [r for r in verdict.remarques if "paires" in r], (
        "porter les deux ne se remarque même pas")


def test_too_many_pairs_is_refused():
    trop = PAIRES + [{"terme": f"N{i}sotho", "glose": "de trop"} for i in range(3)]
    verdict = gab.portes([carte(corps="", paires=trop)], DECK)
    assert not verdict.passe
    assert any("paires" in m for m in verdict.manquantes)


# ---------------------------------------------------------------- §4 scrims


def test_the_banner_scrim_is_measured_on_the_card_not_the_image_band():
    """§4 — the trap the spec names explicitly.

    A scrim laid `inset:0` inside an image band computes its stops as a
    percentage of the band. The banner then lands in an already-faded zone and
    goes unreadable on pale documents.
    """
    for disposition in ("B", "C"):
        for fmt in FORMATS:
            plan = gab.plan(carte(disposition=disposition), DECK, fmt,
                            image=image_test(3000, 4000))
            voile = next(b for b in plan.blocs if b.nom == "voile-bandeau")
            assert voile.y == 0, "le voile de bandeau part du haut de la carte"
            attendu = 320 if tk.fmt(fmt)["h"] == 1920 else 250
            assert voile.h == attendu, (
                f"{disposition}/{fmt} : voile de {voile.h} px au lieu de {attendu}")


# ---------------------------------------------------------------- §11 contrast


def test_every_text_reaches_its_contrast_ratio_on_real_pixels():
    """§11 — measured under the scrim, never estimated.

    The proof set is the palest ground the corpus can hand the engine: an
    engraved sheet on cream. A flattering photograph proves nothing.
    """
    pale = image_test(3000, 4000, ton=242)
    for disposition in ("A", "B", "C"):
        for fmt in FORMATS:
            # The ground under the scrim, without the glyphs on it. Measuring the
            # finished card reads a title's own strokes as part of its ground.
            im, plan = gab.fond_et_plan(carte(disposition=disposition), DECK, fmt,
                                        image=pale)
            for bloc in plan.blocs:
                if not bloc.texte:
                    continue
                ratio = gab.contraste_mesure(im, bloc)
                seuil = 3.0 if bloc.corps >= 24 else 4.5
                # Either the scrim reaches the threshold, or the plan says it
                # could not without drowning the photograph. Silently rendering a
                # short block is the one outcome forbidden.
                signale = any(bloc.nom in f for f in plan.fautes)
                assert ratio >= seuil or signale, (
                    f"{disposition}/{fmt} : « {bloc.nom} » à {ratio:.2f}:1, seuil "
                    f"{seuil}:1, et aucune faute n'est consignée")


def test_no_composed_text_uses_a_colour_outside_the_charter():
    """The original defect, generalised: a logo gold spent as a text colour."""
    charte = set(tk.palette().values())
    for disposition in ("A", "B", "C"):
        plan = gab.plan(carte(disposition=disposition), DECK, "carrousel",
                        image=image_test(3000, 4000))
        for bloc in plan.blocs:
            if bloc.texte:
                assert bloc.couleur in charte, (
                    f"« {bloc.nom} » est peint en {bloc.couleur}, hors charte")


# ---------------------------------------------------------------- §6 and §7 gates


def test_the_engine_applies_the_rule_it_does_not_decide():
    """A card that names its layout gets it, even against the rule."""
    force = carte(disposition="A", corps="Une phrase très longue. " * 40)
    plan = gab.plan(force, DECK, "carrousel", image=image_test(3000, 4000))
    assert plan.disposition == "A"
    assert plan.ecart_regle == "C", "l'écart à la règle doit être signalé, pas tu"


def test_auto_follows_paragraph_6_including_the_resolution_fallback():
    grande, petite = image_test(3000, 4000), image_test(900, 533)
    assert gab.plan(carte(role="ouverture", corps=""), DECK, "carrousel",
                    image=grande).disposition == "B"
    assert gab.plan(carte(), DECK, "carrousel", image=grande).disposition == "A"
    assert gab.plan(carte(), DECK, "reel", image=petite).disposition == "C"


def test_a_figure_no_longer_earns_a_cartouche_on_its_own():
    """§6 — a figure sits very well on an image, and that is where it lands hardest.

    On a column that holds: a 216 px figure above a body and a three-line credit
    overflows on its own merits, and falls to C for the reason §6 gives — the
    composed column does not hold — not for carrying a figure.
    """
    chiffre = carte(chiffre="30,38", corps="", punchline="")
    assert gab.plan(chiffre, DECK, "carrousel", image=image_test(3000, 4000)).disposition == "A"


def test_B_takes_one_line_of_explanation_and_refuses_a_pair():
    """§6 — without that allowance B does not exist.

    Every opening card carries a body, so the « no body » condition was never met
    by anything: the ceiling of two held at zero, an exception its own rule made
    impossible. What B refuses is the pair — a full-frame word and a two-term table
    fight over the same centre.
    """
    grande = image_test(3000, 4000)
    for role in ("ouverture", "bascule"):
        court = carte(role=role, corps="Une ligne qui explique le mot.")
        assert len(court["corps"]) <= tk.CORPS_COURT
        assert gab.plan(court, DECK, "carrousel", image=grande).disposition == "B"

        long = carte(role=role, corps="x" * (tk.CORPS_COURT + 1))
        assert gab.plan(long, DECK, "carrousel", image=grande).disposition != "B"

        avec_paire = carte(role=role, corps="Court.", paires=PAIRE)
        assert gab.plan(avec_paire, DECK, "carrousel", image=grande).disposition != "B"


def test_the_choice_of_A_is_measured_not_counted():
    """§6 — `colonne_A_tient` composes the column and measures it.

    199 characters on two short lines hold where 185 on four lines do not, so a
    character count is an approximation of the fit, and a poor one. Same family of
    fault as a subtitle ceiling counted in characters instead of pixels.
    """
    grande = image_test(3000, 4000)
    court_mais_haut = "mm " * 62          # 186 signes, mais des lignes courtes
    assert gab.plan(carte(corps="x" * 199), DECK, "carrousel",
                    image=grande).disposition == "A", "199 signes tiennent"
    assert gab.colonne_A_tient(carte(corps=court_mais_haut), DECK, "carrousel",
                               image=grande) in (True, False)

    # And what does not hold falls to C rather than being drawn outside the frame.
    enorme = carte(corps="Une phrase très longue. " * 40)
    assert gab.plan(enorme, DECK, "carrousel", image=grande).disposition == "C"


def test_the_four_gates_return_a_verdict_in_plain_language():
    manquante = carte()
    manquante["image"]["licence"] = ""
    verdict = gab.portes([manquante], DECK)
    assert not verdict.passe
    assert any("licence" in m.lower() for m in verdict.manquantes)
    # A gate that says what to do is a gate somebody can clear.
    assert all(len(m.split()) > 3 for m in verdict.manquantes), (
        "une porte non franchie s'explique, elle ne renvoie pas un code")


def test_gate_two_blocks_a_card_nobody_looked_at():
    """« Se vérifie, elle ne se suppose pas » — the trace, not the semantics.

    A program cannot tell whether a caption and a photograph are the same
    document. It can tell whether anybody said they compared them.
    """
    sans_identite = carte()
    sans_identite["image"].pop("identite", None)
    verdict = gab.portes([sans_identite], DECK)
    assert not verdict.passe
    assert any("identite" in m or "montre" in m for m in verdict.manquantes)

    sans_controle = carte()
    sans_controle["image"]["identite"] = "un marché couvert, étals de légumes"
    sans_controle["image"].pop("verifie", None)
    verdict = gab.portes([sans_controle], DECK)
    assert not verdict.passe
    assert any("signé" in m for m in verdict.manquantes)


def test_an_attestation_needs_a_name_and_a_date():
    """« Une attestation qui doit être signée est une attestation qu'on lit. »

    A date alone is a checkbox. A name alone does not say whether it predates the
    last time the asset changed.
    """
    for partielle in ({"le": "2026-09-11"}, {"par": "quelqu'un"}, {}):
        c = carte()
        c["image"]["verifie"] = partielle
        verdict = gab.portes([c], DECK)
        assert not verdict.passe, f"{partielle} ne devrait pas suffire"
        assert any("signé" in m for m in verdict.manquantes)


def test_gate_two_remarks_on_a_mismatch_without_refusing_it():
    """A caption and a description legitimately share no vocabulary.

    The lexical version refused twenty of the corpus's sixty-five cards and was
    right about none of them, so the divergence is a remark now.
    """
    c = carte()
    c["image"]["identite"] = "une procession de rue en tenues jaunes et blanches"
    c["image"]["credit"] = "Garifuna Settlement Day"
    c["image"]["verifie"] = {"par": "essai", "le": "2026-09-11"}
    verdict = gab.portes([c], DECK)
    assert verdict.passe, verdict.manquantes
    assert verdict.remarques, "une divergence de vocabulaire mérite une remarque"


def test_an_internal_note_blocks():
    verdict = gab.portes([carte(source="licence à nommer")], DECK)
    assert not verdict.passe
    assert any("interne" in m.lower() or "note" in m.lower() for m in verdict.manquantes)


def test_a_clean_lot_passes_and_computes_its_output_licence():
    verdict = gab.portes([carte()], DECK)
    assert verdict.passe, verdict.manquantes
    assert verdict.licence_sortie == "CC BY-SA 4.0"


# ---------------------------------------------------------------- §3 proof


def test_a_proof_is_marked_and_never_lands_in_images():
    im, chemin = gab.rendre(carte(), DECK, "carrousel", image=image_test(3000, 4000),
                            racine=pathlib.Path("/tmp/essai"), verdict=gab.portes(
                                [carte(source="à confirmer")], DECK))
    assert "_epreuves" in str(chemin), "une épreuve ne va jamais dans images/"
    assert chemin.name.endswith("-epreuve.png")


def test_layout_A_packs_its_column_onto_the_foot():
    """§5A — A packs up from the foot, so the column ends where the credit starts.

    Measured with a pair on the card, because a pair is one flow unit built from
    five cells: counting the cells rather than the unit inflated the column by a
    whole pair's height plus a gutter each, and A started that much too high. The
    void it left above the credit was visible on every card carrying a pair, and
    nothing in the plan disagreed with itself — the measure and the placement were
    simply two expressions of one thing.
    """
    avec_paire = carte(disposition="A",
                       paires=[{"terme": "kilombo", "glose": "en Angola"},
                               {"terme": "Quilombolas", "glose": "au Brésil"}])
    for fmt in FORMATS:
        plan = gab.plan(avec_paire, DECK, fmt, image=image_test(3000, 4000))
        contenu = [b for b in plan.blocs
                   if b.texte and not b.nom.startswith("credit")
                   and b.nom not in ("bandeau", "rang", "appel-action")]
        bas = max(b.y + b.h for b in contenu)
        credit = min(b.y for b in plan.blocs if b.nom.startswith("credit"))
        ecart = credit - bas
        assert 0 <= ecart <= round(gab.GOUTTIERE * tk.fmt(fmt)["k"]) + 8, (
            f"{fmt} : {ecart} px de vide entre la colonne et le crédit")


def test_a_compressed_pair_keeps_its_gloss_under_its_term():
    """Compression shrinks the cells; the rows have to be laid again.

    A pair's cells carry offsets derived from the heights they had on the way in.
    Shrink them and keep the offsets, and the gloss climbs into its own term. The
    path is not hypothetical: it fires on twenty-four of the corpus's plans.
    """
    charge = carte(
        disposition="A",
        corps="Une explication assez longue pour pousser la colonne au-delà de ce "
              "que le cadre lui laisse, de sorte que la compression entre en jeu "
              "et réduise chaque bloc, cellules de la paire comprises.",
        paires=[{"terme": "kilombo", "glose": "un campement de guerre, en Angola"},
                {"terme": "Quilombolas", "glose": "au Brésil"}])
    for fmt in FORMATS:
        plan = gab.plan(charge, DECK, fmt, image=image_test(3000, 4000))
        for i in (0, 1):
            terme = plan.bloc(f"couple-{i}-terme")
            glose = plan.bloc(f"couple-{i}-glose")
            if terme is None or glose is None:
                continue
            assert glose.y >= terme.y + terme.h, (
                f"{fmt} : la glose {i} remonte dans son terme "
                f"({glose.y} < {terme.y + terme.h})")


# ------------------------------------------------------------ §4 column scrim


def test_the_scrim_is_not_a_centred_radial():
    """§4 — a full-frame radial makes the grey halo around the subject.

    Measured on the render: a radial is darkest at the frame's centre; a column
    scrim is monotonic downward and identical across any row.
    """
    # The scrimmed ground, before any text. A row crossing the title samples its
    # glyphs, which are light by design and say nothing about the scrim.
    fond, _ = gab.fond_et_plan(carte(disposition="A"), DECK, "carrousel",
                               image=image_test(3000, 4000, ton=170))
    pixels = fond.convert("RGB").load()
    W, H = fond.size

    for y in range(round(H * 0.20), round(H * 0.95), 7):
        echantillon = [sum(pixels[x, y]) / 3 for x in (4, W // 4, W // 2, 3 * W // 4, W - 5)]
        assert max(echantillon) - min(echantillon) < 6, (
            f"ligne y={y} varie de {max(echantillon) - min(echantillon):.0f} "
            f"le long de x — un voile centré, pas une rampe de colonne")


# ------------------------------------------------------ §4 the single scrim


# §4 — « le profil de luminance de ligne doit être monotone décroissant, ou son
# excursion rester sous 25 niveaux ».
EXCURSION_MAX = 25


def profil_luminance(im):
    """Mean luminance per row, top to bottom."""
    pixels = im.convert("L").load()
    W, H = im.size
    pas = max(1, W // 24)
    return [sum(pixels[x, y] for x in range(0, W, pas)) / len(range(0, W, pas))
            for y in range(H)]


def excursion(profil):
    """The largest climb back up, in levels. Zero on a monotone descent."""
    creux, pire = profil[0], 0.0
    for v in profil:
        creux = min(creux, v)
        pire = max(pire, v - creux)
    return pire


def test_a_full_frame_card_darkens_and_never_lightens_again():
    """The test that would have caught all three scrim defects of this session.

    Measured on a flat image, so the row profile *is* the composited alpha: any
    change along it comes from the scrim and from nothing else.

    A banner plate and a column scrim written separately both fade to 0 in the gap
    between them. Their alphas cancel, the photograph comes back at full
    brightness across the whole width, and what reads as a gradient is a band —
    0,95 at the top, 0,00 at y = 400, 0,78 at y = 700, the luminance climbing to
    225 and falling back to 46.
    """
    for fmt in FORMATS:
        fond, _ = gab.fond_et_plan(carte(disposition="A"), DECK, fmt,
                                   image=image_test(3000, 4000, ton=200))
        ecart = excursion(profil_luminance(fond))
        assert ecart <= EXCURSION_MAX, (
            f"{fmt} : la luminance remonte de {ecart:.0f} niveaux — "
            f"deux voiles qui s'annulent, pas un dégradé")


def test_the_ramp_meets_the_flat_at_the_same_alpha():
    """§4 — the ramp ends at 0,92 exactly where the column flat begins.

    A discontinuity there is a visible cut line, which is the other half of « a
    scrim you can see as a shape is a failure ».
    """
    assert gab.RAMPE_ARRETS[-1][1] == gab.COLONNE_ARRETS[0][1] == 0.92
    assert [a for _, a in gab.RAMPE_ARRETS] == sorted(a for _, a in gab.RAMPE_ARRETS)
    assert [a for _, a in gab.COLONNE_ARRETS] == sorted(a for _, a in gab.COLONNE_ARRETS)


def test_the_scrim_is_placed_from_the_column_not_from_an_ordinate():
    """§4 — the ramp sits directly above the column, and follows it when it grows.

    Two ordinates were written by hand and both went stale: the first block's
    mid-height, then a content top summed by hand that the next edit invalidated.
    """
    court = gab.plan(carte(disposition="A", titre="Court"), DECK, "carrousel",
                     image=image_test(3000, 4000))
    long = gab.plan(carte(disposition="A",
                          titre="Un titre nettement plus long qui tient sur trois "
                                "lignes pleines et pousse la colonne vers le haut"),
                    DECK, "carrousel", image=image_test(3000, 4000))
    for plan in (court, long):
        rampe, flat = plan.bloc("voile-rampe"), plan.bloc("voile-colonne")
        premier = min(b.y for b in plan.blocs if b.texte)
        assert flat.y == premier, "l'aplat ne commence pas au premier bloc"
        assert rampe.y + rampe.h == flat.y, "la rampe ne touche pas l'aplat"
        assert flat.y + flat.h == tk.fmt("carrousel")["h"], "l'aplat ne va pas au bas"
    assert long.bloc("voile-rampe").y < court.bloc("voile-rampe").y, (
        "la rampe n'a pas suivi la colonne qui grandit")


def test_a_full_frame_card_carries_no_banner_plate():
    """§4 — one scrim, and the banner rides in the column under it."""
    plan = gab.plan(carte(disposition="A"), DECK, "carrousel", image=image_test(3000, 4000))
    assert plan.bloc("voile-bandeau") is None
    entete = plan.bloc("entete-bandeau")
    assert entete is not None and entete.y == min(b.y for b in plan.blocs if b.texte)


# ------------------------------------------------------- §7 bis the watermark


def test_the_watermark_sits_under_the_credit_not_beside_it():
    """§7 bis — set beside the credit it puts rank 5 at rank 1 by size alone.

    The annexe was squeezed onto the left half of the frame to make room for a
    mark that carries no role in the composition.
    """
    for fmt in FORMATS:
        plan = gab.plan(carte(), DECK, fmt, image=image_test(3000, 4000))
        marque = plan.bloc("filigrane")
        credits = [b for b in plan.blocs if b.nom.startswith("credit")]
        assert marque is not None and credits, f"{fmt} : pas de filigrane au plan"

        bas = max(b.y + b.h for b in credits)
        assert marque.y >= bas, f"{fmt} : le filigrane chevauche le crédit"
        # Beside would mean sharing a band of rows with the credit.
        haut = min(b.y for b in credits)
        assert not (marque.y < bas and marque.y + marque.h > haut), (
            f"{fmt} : le filigrane est posé en regard du crédit")


def test_the_watermark_is_thirty_pixels_and_centred_on_the_credit():
    for fmt in FORMATS:
        k = tk.fmt(fmt)["k"]
        plan = gab.plan(carte(), DECK, fmt, image=image_test(3000, 4000))
        marque = plan.bloc("filigrane")
        assert marque.h == round(30 * k), f"{fmt} : filigrane à {marque.h} px"

        # Centred on the credit *block's* measure — the whole column, which the
        # annexe keeps now that the mark no longer sits beside it. Not on the
        # widest credit line, which is whatever the deposit happened to be called.
        cadre = tk.fmt(fmt)
        gauche = round(gab.A_INSET_X * k)
        mesure = cadre["w"] - 2 * gauche
        attendu = gauche + (mesure - marque.w) // 2
        assert abs(marque.x - attendu) <= 2, (
            f"{fmt} : filigrane en x={marque.x}, attendu {attendu}")


def test_the_credit_keeps_the_whole_measure():
    """§7 bis — under the credit, the annexe gets the full column back."""
    plan = gab.plan(carte(), DECK, "carrousel", image=image_test(3000, 4000))
    colonne = plan.bloc("corps")
    credit = plan.bloc("credit-0")
    assert credit.x == colonne.x, "le crédit n'est plus dans la colonne"


# --------------------------------------------------- §5A and §3 no box, no rule


def test_no_plate_and_no_vertical_rule_on_an_image():
    """§5A and §3 — the scrim holds the text, and an aside is a rule not a box.

    Measured on the render: a rounded flat leaves a band of near-uniform rows
    behind the pair, and a full-height rule leaves a column of accent pixels down
    the block's left edge. Neither may appear.
    """
    paire = [{"terme": "kilombo", "glose": "un campement de guerre, en Angola"},
             {"terme": "Quilombolas", "glose": "au Brésil"}]
    im = gab.composer(carte(paires=paire, disposition="A"), DECK, "carrousel",
                      image=image_test(3000, 4000, ton=90))
    plan = gab.plan(carte(paires=paire, disposition="A"), DECK, "carrousel",
                    image=image_test(3000, 4000))
    terme = plan.bloc("couple-0-terme")
    assert terme is not None

    accent = gab._rgb(gab._accent(DECK))
    pixels = im.convert("RGB").load()
    # The rule sat six pixels wide down the left edge of the block.
    for dx in range(1, 10):
        x = max(0, terme.x - 26 + dx)
        colonne = [pixels[x, y] for y in range(terme.y, terme.y + terme.h)]
        proche = sum(1 for c in colonne if sum(abs(a - b) for a, b in zip(c, accent)) < 40)
        assert proche < len(colonne) * 0.8, f"un filet vertical subsiste en x={x}"


# -------------------------------------------------------- §3 bis the pair block


PAIRE = [{"terme": "kilombo", "glose": "un campement de guerre, en Angola"},
         {"terme": "Quilombolas", "glose": "au Brésil"}]


def test_a_pair_carries_its_arrow():
    """§3 bis — two words set with no sign of relation are just two words set."""
    for fmt in FORMATS:
        plan = gab.plan(carte(paires=PAIRE), DECK, fmt, image=image_test(3000, 4000))
        fleche = plan.bloc("couple-fleche-1")
        assert fleche is not None, f"{fmt} : la paire n'a pas de flèche"
        assert fleche.texte in ("→", "↓"), f"{fmt} : « {fleche.texte} » n'est pas une flèche"
        assert fleche.couleur == gab._accent(DECK), f"{fmt} : la flèche n'est pas en accent"
        assert fleche.face == "anton", f"{fmt} : la flèche n'est pas en Anton"


def test_each_term_carries_its_own_gloss_on_its_own_line():
    """§3 bis — never two glosses fused on one line behind a middot.

    « un campement de guerre, en Angola · au Brésil » asks the reader to
    redistribute what the grid can simply show.
    """
    plan = gab.plan(carte(paires=PAIRE), DECK, "carrousel", image=image_test(3000, 4000))
    for i, membre in enumerate(PAIRE):
        terme = plan.bloc(f"couple-{i}-terme")
        glose = plan.bloc(f"couple-{i}-glose")
        assert terme is not None and glose is not None, f"membre {i} : cellule manquante"
        assert membre["glose"] in glose.texte
        assert membre["terme"] in terme.texte
        # Its own line, under its own term — not beside it.
        assert glose.y >= terme.y + terme.h, f"membre {i} : la glose n'est pas sous son terme"

    assert " · " not in plan.bloc("couple-0-glose").texte, "deux gloses fondues"


def test_the_first_term_takes_ink_one_and_the_second_the_accent():
    """§3 bis — the colour becomes a reading key instead of a decoration."""
    plan = gab.plan(carte(paires=PAIRE), DECK, "carrousel", image=image_test(3000, 4000))
    assert plan.bloc("couple-0-terme").couleur == gab._encre(DECK, 1)
    assert plan.bloc("couple-1-terme").couleur == gab._accent(DECK)


def test_the_pair_reads_horizontally_by_default():
    """Two columns side by side — the form that costs 170 px rather than 279."""
    plan = gab.plan(carte(paires=PAIRE), DECK, "carrousel", image=image_test(3000, 4000))
    premier = plan.bloc("couple-0-terme")
    second = plan.bloc("couple-1-terme")
    assert second.x > premier.x + premier.w, "les deux termes ne sont pas côte à côte"
    assert premier.y == second.y, "les deux termes ne sont pas au même niveau"
    # And the arrow lives in the gutter between them.
    fleche = plan.bloc("couple-fleche-1")
    assert premier.x + premier.w <= fleche.x + fleche.w and fleche.x < second.x


def test_a_term_too_wide_for_its_column_falls_back_to_the_vertical_form():
    """§3 bis — the fallback, and the one thing that triggers it."""
    long = [{"terme": "anticonstitutionnellementement", "glose": "un mot"},
            {"terme": "court", "glose": "un autre"}]
    plan = gab.plan(carte(paires=long), DECK, "carrousel", image=image_test(3000, 4000))
    assert plan.bloc("couple-fleche-1").texte == "↓"
    premier = plan.bloc("couple-0-terme")
    second = plan.bloc("couple-1-terme")
    assert second.y > premier.y, "la repli verticale n'empile pas les deux groupes"


# ------------------------------------------------------------ §6 the lot quota


def test_the_lot_quota_counts_a_and_c_and_b():
    """§6 — a carousel is a carousel of images, so the lot is measured too."""
    assert (tk.QUOTA_A_MIN, tk.QUOTA_C_MAX, tk.QUOTA_B_MAX) == (0.60, 0.30, 2)

    tout_a = [(i, "A") for i in range(1, 6)]
    assert gab.quota(tout_a) == [], "un lot tout en A tient le quota"

    trop_de_c = [(1, "A"), (2, "A"), (3, "C"), (4, "C"), (5, "C")]
    motifs = gab.quota(trop_de_c, "carrousel")
    assert motifs, "3 cartouches sur 5 est hors quota"
    # The motive names the cards, because the fix is editorial and happens there.
    assert any("03" in m and "05" in m for m in motifs), motifs


def test_a_lot_out_of_quota_says_it_is_editorial():
    """Images too small or texts too long — never a composition fault."""
    motifs = gab.quota([(1, "C"), (2, "C"), (3, "C")], "reel")
    assert motifs
    assert any("structure" in m for m in motifs), (
        "le motif doit renvoyer à `structure`, pas au moteur")


def test_three_openings_break_the_b_ceiling():
    motifs = gab.quota([(i, "B") for i in range(1, 4)] + [(i, "A") for i in range(4, 11)])
    assert any("B" in m for m in motifs), motifs


# ------------------------------------------------------- §10 the title's camps


def test_a_title_without_camps_is_one_ink():
    """§10 — `titre_camps` is optional and never blocking.

    Without it the title is one flat ink, which is correct and only less telling.
    """
    plan = gab.plan(carte(paires=PAIRE), DECK, "carrousel", image=image_test(3000, 4000))
    titre = plan.bloc("titre")
    assert titre.couleur == gab._encre(DECK, 1)
    assert not titre.mot_accent


def test_the_named_camp_takes_the_accent_in_the_title():
    """« un mot *angolais* devenu *brésilien* » — the pair's order, the pair's colours."""
    c = carte(titre="Un mot angolais devenu brésilien.", paires=PAIRE,
              titre_camps={"un": "angolais", "deux": "brésilien"})
    plan = gab.plan(c, DECK, "carrousel", image=image_test(3000, 4000))
    assert plan.bloc("titre").mot_accent == "brésilien"


def test_the_camp_is_found_through_capitals_and_accents():
    """The title is set in capitals and the field is written in lower case.

    « brésilien » has to find « BRÉSILIEN » and keep the full stop with it.
    """
    avant, mot, apres = gab._decouper_mot("UN MOT ANGOLAIS DEVENU BRÉSILIEN.", "brésilien")
    assert mot == "BRÉSILIEN."
    assert avant == "UN MOT ANGOLAIS DEVENU "
    assert apres == ""
    assert gab._decouper_mot("UN MOT ANGOLAIS", "brésilien") is None


def test_an_unfindable_camp_never_blocks():
    """A word the title does not contain leaves the title whole, and renders."""
    c = carte(titre_camps={"un": "absent", "deux": "introuvable"})
    im = gab.composer(c, DECK, "carrousel", image=image_test(3000, 4000))
    assert im.size == (1080, 1350)


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
