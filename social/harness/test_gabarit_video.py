"""§9 bis's contract: four fixed slots, two scrims, and an alpha table on luminance.

    ./venv/bin/python test_gabarit_video.py

The carousel gabarit ported to 9:16 produced nine recorded defects on a real
montage. These are the assertions that keep them out — each one named after the
defect it refuses.
"""
import json
import pathlib
import sys

from PIL import Image

import ethni_compose as gab
import ethni_tokens as tk
from ethni_paths import productions_root


PROJETS = productions_root()


def deck_essai():
    fichier = PROJETS / "Libreville" / "cartes.json"
    return json.loads(fichier.read_text(encoding="utf-8"))


def image_de(carte):
    return Image.open(PROJETS / "Libreville" / "assets"
                      / carte["image"]["fichier"]).convert("RGB")


def sous_titre_essai():
    return {"lignes": ["Une ligne de narration", "sur deux lignes."], "pivot": "narration"}


# ------------------------------------------------------- the four fixed slots


def test_a_block_never_moves_because_the_subtitle_appeared():
    """§9 bis's most important rule, and the defect it refuses.

    A title that drops when the subtitle clears reads as a rendering fault. The
    narration slot is therefore reserved even when empty: an empty slot costs
    nothing and guarantees nothing moves.
    """
    deck = deck_essai()
    for carte in deck["cartes"]:
        image = image_de(carte)
        avec = gab.plan_video(carte, deck, image=image, sous_titre=sous_titre_essai())
        sans = gab.plan_video(carte, deck, image=image, sous_titre=False)

        boites = lambda p: {b.nom: (b.x, b.y, b.w, b.h) for b in p.blocs}
        a, s_ = boites(avec), boites(sans)
        for nom in set(a) & set(s_):
            assert a[nom] == s_[nom], (
                f"carte {carte['rang']} : « {nom} » bouge selon le sous-titre — "
                f"{a[nom]} avec, {s_[nom]} sans")


def test_the_narration_slot_is_reserved_even_empty():
    deck = deck_essai()
    p = gab.plan_video(deck["cartes"][1], deck, image=image_de(deck["cartes"][1]),
                       sous_titre=False)
    bande = p.bloc("bande-sous-titre")
    assert bande is not None, "l'emplacement de narration n'est pas réservé"
    assert (bande.y, bande.h) == gab.V_NARRATION


def test_the_slots_are_where_the_spec_puts_them():
    deck = deck_essai()
    serie = deck["cartes"][0]
    p = gab.plan_video(serie, deck, image=image_de(serie))
    assert p.bloc("v-serie").y == gab.V_SERIE_Y

    haut, h = gab.V_TITRE
    titre = p.bloc("v-titre") or p.bloc("v-chiffre")
    assert titre.y + titre.h <= haut + h, "le titre n'est pas ancré en bas de son emplacement"

    credit = min(b.y for b in p.blocs if b.nom.startswith("credit"))
    bas = max(b.y + b.h for b in p.blocs if b.nom.startswith("credit"))
    assert bas == 1920 - gab.V_CREDIT_BAS, f"le crédit finit à {bas}"
    assert credit < bas


def test_a_fixed_slot_overflows_upward_and_says_so():
    """§9 bis — eleven characters took a title from two lines to three.

    285 px in a slot of 220, its first line 65 px above at alpha 0,43 and 2,63:1.
    The floor never moves; what a long block does is push its own top out, and the
    measure records it so a copy edit is caught here and not on screen.
    """
    deck = deck_essai()
    carte = dict(deck["cartes"][1],
                 titre="Un titre nettement trop long pour son emplacement, qui "
                       "occupe trois lignes pleines là où deux sont prévues")
    p = gab.plan_video(carte, deck, image=image_de(carte))

    haut, h = gab.V_TITRE
    titre = p.bloc("v-titre")
    assert titre.y + titre.h <= haut + h + 1, "le plancher de l'emplacement a bougé"
    assert titre.y < haut, "le dépassement ne sort pas par le haut"
    assert any("emplacement" in f for f in p.fautes), (
        "un dépassement doit être consigné, pas seulement dessiné")


def test_a_slot_that_holds_records_no_fault():
    deck = deck_essai()
    for carte in deck["cartes"]:
        p = gab.plan_video(carte, deck, image=image_de(carte))
        assert not p.fautes, f"carte {carte['rang']} : {p.fautes}"


# --------------------------------------------------- what the video takes away


def test_the_video_carries_no_rank_and_no_scroll_cue():
    """One does not leaf through a video, and one does not swipe a reel.

    The pastille is the exception and it is §9 bis's own: it is on the closing and
    on no other keyframe, because it is the one image whose job is to say *leave*.
    """
    deck = deck_essai()
    for carte in deck["cartes"]:
        p = gab.plan_video(carte, deck, image=image_de(carte))
        for interdit in ("rang", "entete-rang", "defilement"):
            assert p.bloc(interdit) is None, f"carte {carte['rang']} porte « {interdit} »"
        attendu = carte.get("role") == "bascule"
        assert (p.bloc("appel-action") is not None) == attendu, (
            f"carte {carte['rang']} : pastille "
            f"{'absente' if attendu else 'posée hors clôture'}")


def test_the_series_name_is_on_the_opening_and_the_closing_only():
    deck = deck_essai()
    for carte in deck["cartes"]:
        p = gab.plan_video(carte, deck, image=image_de(carte))
        attendu = carte.get("role") in ("ouverture", "bascule")
        assert (p.bloc("v-serie") is not None) == attendu, (
            f"carte {carte['rang']} · rôle {carte.get('role')} : nom de série "
            f"{'présent' if not attendu else 'absent'}")


def test_everything_is_flush_left():
    deck = deck_essai()
    for carte in deck["cartes"]:
        p = gab.plan_video(carte, deck, image=image_de(carte))
        plaque = p.bloc("plaque-vision")
        for bloc in p.blocs:
            if not bloc.texte or bloc.nom.startswith("credit"):
                continue
            # The vision is padded inside its plate; what is flush left is the
            # plate, which is the edge the reader actually sees.
            bord = plaque.x if plaque is not None and bloc.nom == "v-vision" else bloc.x
            assert bord == gab.V_MARGE_X, (
                f"carte {carte['rang']} : « {bloc.nom} » à x={bord}, pas ferré à gauche")


def test_the_image_is_full_frame_on_every_keyframe():
    """A band with a flat under it reads, in movement, as an edit cut."""
    deck = deck_essai()
    for carte in deck["cartes"]:
        bande = gab.plan_video(carte, deck, image=image_de(carte)).bloc("bande-image")
        assert (bande.x, bande.y, bande.w, bande.h) == (0, 0, 1080, 1920)


# ------------------------------------------------ the two scrims and the gap


def test_no_text_block_falls_between_the_two_scrims():
    """§4's video exception, and the check that replaces monotonicity.

    The profile is not monotone — 0,95 at the top, 0 in the middle, 0,93 at the
    base — and that is licit **because no text lives in the gap**: the bright band
    there is the image, which is the subject.
    """
    deck = deck_essai()
    for carte in deck["cartes"]:
        p = gab.plan_video(carte, deck, image=image_de(carte))
        plaque, bas = p.bloc("voile-plaque"), p.bloc("voile-bas")
        trou = (plaque.y + plaque.h, bas.y)
        for bloc in p.blocs:
            if not bloc.texte:
                continue
            assert not (trou[0] < bloc.y + bloc.h and bloc.y < trou[1]), (
                f"carte {carte['rang']} : « {bloc.nom} » tombe dans l'intervalle "
                f"{trou[0]}–{trou[1]}, entre les deux voiles")


def test_the_plate_plateau_covers_the_label():
    """The plateau has to reach the label's ordinate, and no z-index replaces it.

    A plate declared after the label paints over it and darkens it by its own
    alpha — invisible in review, obvious on screen. But the order only settles the
    layer: if the plateau stops above y = 131, it is the ground under the label
    that lacks scrim.
    """
    assert gab.V_PLAQUE_H * gab.V_PLAQUE_PLATEAU >= gab.V_SERIE_Y + 33, (
        "le plateau de la plaque ne couvre pas le libellé")


def test_the_scrim_reaches_the_alphas_the_spec_names():
    for y, attendu in ((1050, 0.72), (1198, 0.82), (1450, 0.88), (1920, 0.93)):
        assert abs(gab._v_alpha(y) - attendu) < 0.005, (
            f"y={y} : alpha {gab._v_alpha(y):.3f} au lieu de {attendu}")
    assert gab._v_alpha(840) == 0.0
    assert gab._v_alpha(600) == 0.0, "les 42 % hauts du cadre ne portent aucun voile"


# ---------------------------------------------- §4's table, keyed on luminance


def test_the_alpha_table_is_keyed_on_luminance_not_size():
    """The error that produced the same defect three times.

    A 150 px gold figure measured 2,15:1 where the same figure in ink 1 held
    5,8:1 at the same alpha. Size has nothing to do with it: the gold is a fill
    colour in the charter and carries a third less luminance than ink 1.
    """
    encre1 = tk.color("--afh-night-ink")
    accent = tk.color("--afh-night-ocre-soft")

    assert tk.luminance(accent) < tk.luminance(encre1) * 0.7, (
        "l'accent doit porter nettement moins de luminance que l'encre 1")
    assert tk.alpha_min(accent, 3.0) > tk.alpha_min(encre1, 3.0), (
        "l'accent exige plus de voile que l'encre 1 au même seuil")
    assert tk.alpha_min(accent, 3.0) == tk.ALPHA_ACCENT == 0.84
    assert tk.alpha_min(encre1, 3.0) == 0.80


def test_below_the_accent_floor_the_display_takes_ink_one():
    """§4's corollary — one does not thicken a scrim to keep a gold, one moves it."""
    encre1 = tk.color("--afh-night-ink")
    accent = tk.color("--afh-night-ocre-soft")
    assert tk.encre_affichage(0.72, accent, encre1) == encre1
    assert tk.encre_affichage(0.83, accent, encre1) == encre1
    assert tk.encre_affichage(0.84, accent, encre1) == accent


def test_all_video_display_is_ink_one_figure_included():
    """At 0,72 the gold does not survive, so nothing display-sized wears it."""
    deck = deck_essai()
    accent = gab._accent(deck)
    for carte in deck["cartes"]:
        p = gab.plan_video(carte, deck, image=image_de(carte))
        for nom in ("v-titre", "v-chiffre", "v-precision"):
            bloc = p.bloc(nom)
            if bloc is not None:
                assert bloc.couleur != accent, (
                    f"carte {carte['rang']} : « {nom} » en accent sous un voile à "
                    f"{gab._v_alpha(bloc.y):.2f}")


# --------------------------------------------------------------- the closing


def test_the_closing_link_shares_its_slot_with_the_plate():
    """§9 bis — the bottom slot is 270 px « pour porter la plaque **et** la pastille ».

    The spec says both in as many words. Read as four blocks in four places, the
    vision went into the bottom slot on its own and the running caption plate was
    drawn straight over it — so I took the vision out and left the link alone,
    which is the one thing §9 bis forbids. The plate *is* the vision.
    """
    deck = deck_essai()
    cloture = deck["cartes"][-1]
    p = gab.plan_video(cloture, deck, image=image_de(cloture))
    vision, pastille = p.bloc("v-vision"), p.bloc("appel-action")
    bande = p.bloc("bande-cloture")
    assert vision is not None, "la clôture ne porte pas sa ligne de vision"
    assert pastille is not None, "la clôture ne porte pas sa pastille"
    assert bande.h == gab.V_BAS_CLOTURE
    assert vision.y + vision.h <= pastille.y, "la pastille passe au-dessus de la vision"
    assert pastille.y + pastille.h <= bande.y + bande.h + 1


def test_the_closing_vision_is_set_on_a_plate():
    """The plate is the doctrine, not the voice — so it is a surface in the plan."""
    deck = deck_essai()
    cloture = deck["cartes"][-1]
    p = gab.plan_video(cloture, deck, image=image_de(cloture))
    plaque, vision = p.bloc("plaque-vision"), p.bloc("v-vision")
    assert plaque is not None, "la vision est posée sur l'image, sans plaque"
    assert plaque.x == gab.V_MARGE_X and plaque.w == 1080 - 2 * gab.V_MARGE_X, (
        "la plaque de vision tient la mesure de la colonne, comme au mock")
    assert plaque.y <= vision.y and plaque.y + plaque.h >= vision.y + vision.h, (
        "la plaque ne couvre pas son propre texte")


def test_a_closing_draws_no_running_caption():
    """The defect the user named: the closing said « les noms de lieux arrivent ».

    A closing keyframe carries the vision, which is set. The narration caption
    still running at that instant would land on the same plate and say something
    else — an address, in the one image that has to carry the argument.
    """
    deck = deck_essai()
    cloture = deck["cartes"][-1]
    p = gab.plan_video(cloture, deck, image=image_de(cloture), sous_titre=True)
    assert p.bloc("bande-sous-titre") is None, (
        "la clôture réserve encore une bande de narration : la légende parlée "
        "s'y pose et remplace la vision")


def test_the_closing_label_is_the_brand_line():
    """§7 ter — the closing is constant across every series.

    A label that names one series on an image every series ends on is a label
    that contradicts the doctrine it sits above.
    """
    deck = deck_essai()
    cloture, ouverture = deck["cartes"][-1], deck["cartes"][0]
    ferme = gab.plan_video(cloture, deck, image=image_de(cloture)).bloc("v-serie")
    ouvre = gab.plan_video(ouverture, deck, image=image_de(ouverture)).bloc("v-serie")
    assert "ETHNIAFRICA" in ferme.texte and "ATLAS" in ferme.texte
    assert ouvre.texte != ferme.texte, "l'ouverture perd le nom de sa série"


def test_the_closing_punch_takes_the_accent_across_the_line_break():
    """§9 bis — « Elle le traverse » passes into the accent, in the title.

    It runs across a line break, so a phrase matched inside one line finds
    nothing. What is matched is the position: every word from the punch onward.
    """
    deck = deck_essai()
    cloture = deck["cartes"][-1]
    titre = gab.plan_video(cloture, deck, image=image_de(cloture)).bloc("v-titre")
    assert titre.accent_depuis > 0, "la chute reste en encre 1"
    mots = titre.texte.split()
    assert " ".join(mots[titre.accent_depuis:]).lower().startswith("elle le traverse")


def test_the_closing_holds_the_reversal_in_one_display_sentence():
    """Both halves at the same rank: « Elle le traverse » is the punch."""
    deck = deck_essai()
    cloture = deck["cartes"][-1]
    titre = gab.plan_video(cloture, deck, image=image_de(cloture)).bloc("v-titre")
    assert "ne contient pas" in titre.texte.lower()
    assert "traverse" in titre.texte.lower(), (
        "la chute est reléguée au corps, où elle se lit comme une précision")


def test_the_closing_slots_are_its_own():
    deck = deck_essai()
    cloture = deck["cartes"][-1]
    p = gab.plan_video(cloture, deck, image=image_de(cloture))
    haut, h = gab.V_TITRE_CLOTURE
    titre, datation = p.bloc("v-titre"), p.bloc("v-datation")
    assert datation is not None, "la clôture ne porte pas sa datation"
    assert titre.y >= haut - 1, "le titre de clôture sort de son emplacement"
    assert datation.y + datation.h <= haut + h + 1
    assert p.bloc("bande-cloture").h == gab.V_BAS_CLOTURE


def test_the_sign_off_card_follows_the_closing_and_never_eats_it():
    """§9 bis — la carte de fin suit la clôture ; elle ne la remplace jamais.

    Elle a été retirée une fois, et c'était l'ordre qui était faux, pas la carte :
    placée sur un dégagement calculé contre la bande de légende, elle tombait sur
    la clôture et le film se terminait sur une adresse. Le repère est désormais la
    dernière phrase parlée, donc il ne peut pas précéder la clôture.
    """
    import ethni_montage as mt

    deck = deck_essai()
    assert deck["cartes"][-1].get("role") == "bascule", (
        "le deck ne se termine pas sur une carte de clôture")

    projet = PROJETS / "Libreville"
    mots = mt._mots_alignes(projet)
    import ethni_soustitre as st
    sts = st.minuter(st.segmenter(
        (projet / "narration.fr.txt").read_text(encoding="utf-8")), mots)
    reperes, ecart = mt.reperes_de_scene(projet, deck["cartes"])
    assert ecart is None, ecart

    debut_cloture = sum(mt.durees(deck["cartes"], mots, sts, reperes)[:-1])
    # La carte est passée, comme le montage la passe : sans elle le repère tombe
    # dans le repli et le test garderait un autre chemin que celui qui tourne.
    cue = mt.fin_debut(sts, deck["cartes"][-1])
    assert cue is not None, "aucune phrase n'appelle la carte de fin"
    assert cue >= debut_cloture, (
        f"la carte de fin entre à {cue:.2f}s alors que la clôture commence à "
        f"{debut_cloture:.2f}s — elle mange l'argument")

    # Et elle laisse à la clôture de quoi se lire : quatre blocs, pas un battement.
    assert cue - debut_cloture >= 5.0, (
        f"la clôture ne tient que {cue - debut_cloture:.2f}s avant la carte de fin "
        f"— elle porte un titre, une datation, une plaque et une pastille")


def test_a_scene_starts_where_its_paragraph_is_spoken():
    """« Un paragraphe de narration est une scène », et c'est mesuré.

    Réparti sur les légendes, le compte donnait la clôture à 44,10 s quand sa
    première phrase se dit à 50,88 s : six secondes de doctrine sur un récit qui
    n'avait pas fini.
    """
    import ethni_montage as mt

    deck = deck_essai()
    projet = PROJETS / "Libreville"
    reperes, ecart = mt.reperes_de_scene(projet, deck["cartes"])
    assert ecart is None, ecart

    mots = mt._mots_alignes(projet)
    import ethni_soustitre as st
    sts = st.minuter(st.segmenter(
        (projet / "narration.fr.txt").read_text(encoding="utf-8")), mots)
    durees = mt.durees(deck["cartes"], mots, sts, reperes)

    debut = 0.0
    for i, (repere, duree) in enumerate(zip(reperes, durees), 1):
        assert abs(debut - repere) < 0.01, (
            f"scène {i} commence à {debut:.2f}s, son paragraphe à {repere:.2f}s")
        debut += duree


def test_no_keyframe_carries_a_light_ground_or_a_social_handle():
    """The three things the ending card put on screen, refused at the source."""
    deck = deck_essai()
    assert gab._theme(deck) == "nuit", "un fond clair sur la série"
    poignees = ("tiktok", "instagram", "youtube", "facebook", "@")
    for carte in deck["cartes"]:
        texte = " ".join(str(carte.get(k) or "") for k in
                         ("titre", "precision", "corps", "source", "appel")).lower()
        for poignee in poignees:
            assert poignee not in texte, (
                f"carte {carte.get('rang')} : « {poignee} » est gravé dans l'image, "
                f"où il n'est pas cliquable — les identifiants vivent dans la description")


def test_the_closing_punch_holds_its_contrast_on_the_pixels():
    """The one place §4's table is not the last word, and §9 bis says so.

    The gold needs 0,84 and the closing's scrim reaches 0,78 under the title, so
    by the table the punch could not be gold. §9 bis puts it there in as many
    words and gives the method: measure this card, not the corpus.
    """
    deck = deck_essai()
    cloture = deck["cartes"][-1]
    image = image_de(cloture)
    plan = gab.plan_video(cloture, deck, image=image)
    im = gab.peindre_video(cloture, deck, image=image, plan_donne=plan)

    titre = plan.bloc("v-titre")
    ligne = titre.corps * titre.interligne
    # The last composed line is entirely the punch, so its box is the accent's.
    chute = gab.Bloc("chute", titre.x, round(titre.y + ligne * (len(titre.lignes) - 1)),
                     titre.w, round(ligne), "x", gab._accent(deck))
    ratio = gab.contraste_mesure(im, chute)
    assert ratio >= 3.0, (
        f"la chute en accent mesure {ratio:.2f}:1 sur les pixels composés — "
        f"sous 3:1 elle repasse en encre 1 et le voile ne s'épaissit pas")


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
