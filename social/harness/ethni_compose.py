"""The composition engine for GABARITS-SOCIAL.md — three layouts, three formats.

Takes a migrated card (§10), a format and a theme, and returns an image.

Two entry points, and the split is deliberate:

- `plan()` returns the geometry without drawing anything. Everything worth
  asserting about a composition — nothing overflows, no two blocks collide, the
  foot clears the platform interface — is a fact about the plan, and a test that
  reads the plan fails with a block name instead of a pixel diff.
- `composer()` draws a plan.

`rendre()` puts a rendered card where its verdict says it belongs, and
`portes()` computes that verdict.

## What this module does not decide

It **applies** `ethni_tokens.choisir()`. A card that names its layout gets that
layout even where the rule would have said otherwise, and the gap is recorded in
`plan().ecart_regle` rather than silently corrected. An engine that overrides the
author is an engine the author has to fight.

Every colour and face comes from `ethni_tokens`; every dimension from the spec.
There is no literal here, and `test_ethni_tokens.py` fails if one appears.
"""
import json
import math
import pathlib
import re
import unicodedata
from dataclasses import dataclass, field

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import ethni_tokens as tk

HARNESS = pathlib.Path(__file__).resolve().parent

# §5 — the banner scrim's height, per aspect. Anchored on the card, never on an
# image band: a scrim laid inside the band computes its stops as a percentage of
# the band, and the banner lands in an already-faded zone.
VOILE_BANDEAU = {1350: 250, 1080: 250, 1920: 320}

# §5 — a band is a fraction of the CARD's height, never a fixed pixel height, and
# the same fraction in every format. A fixed height would read as 42 % in 4:5 and
# 29 % in 9:16: the same card would stop being recognisable from one format to
# the next, which is the whole point of having one system.
#
# All the surplus height goes to the flat, which carries no composition
# constraint. The image's crop is identical across formats — the card lengthens,
# the photograph does not recompose.
BANDE_B = 0.37
BANDE_C = 0.49

# §5C — with the subtitle band active in 9:16 the image gives up height to the
# text, never the other way round.
BANDE_C_SOUS_TITRE = 0.30

# §8 — what the exit gesture says when a card does not name its own. One address,
# in one place: the pastille. Repeating it in the body turns a gesture into a
# refrain.
APPEL_DEFAUT = "ethniafrica.com"

# §8 — the scroll cue on a carousel's cover. It says *continue* where the pastille
# says *leave*, so the two never share a card and share the same slot.
DEFILEMENT = "Fais défiler"
DEFILEMENT_CORPS = 26
DEFILEMENT_INTERLETTRE = 0.12

# §10 — two to four pairs. A fifth line turns a demonstration into a table, and a
# table is not read at thumb speed.
PAIRES_MIN, PAIRES_MAX = 2, 4
# §3 bis — each column of a pair, and the gutter the arrow lives in, in px at k = 1.
COUPLE_COLONNE = 330
COUPLE_GOUTTIERE = 56

# §3 bis and §10 — the two block families the column stacks as one unit each: a
# pair's two columns, and a table's rows. Their cells carry a y relative to the
# unit's own top, so the flow places the unit and never the cells.
GROUPES = ("couple-", "entete-")

# §5A — the content block's inset, and the gutter inside its column.
A_INSET_X = 96
GOUTTIERE = 32
# §5A — the credit rides in the same flex column as the plaque, one gutter below.
GOUTTIERE_CREDIT = 20
# §7 bis — between the credit block and the watermark that closes it.
FILIGRANE_GOUTTIERE = 16

# §4 — the ramp's height, in px at k = 1. It sits directly above the content
# column, so it follows the column when the column grows; an estimated ordinate
# does not. Nothing else about the scrim is a number: the rest is a relation.
RAMPE = 300

# §4 — the one scrim's alphas. The column flat starts at 0,92, so the first block
# is covered whatever it is, banner or title — which is what makes the rule
# independent of the order of the blocks. It never comes back down.
RAMPE_ARRETS = ((0.00, 0.00), (0.20, 0.06), (0.55, 0.20), (0.78, 0.50), (1.00, 0.92))
COLONNE_ARRETS = ((0.00, 0.92), (0.40, 0.94), (1.00, 0.95))

# §4 and §3 — tracking, expressed as the width it adds. PIL draws no tracking, so
# this is what the measure has to allow for.
BANDEAU_INTERLETTRE = 0.16
RANG_INTERLETTRE = 0.14

# §3 — the annexe's opacity. It takes ink 2, not ink 3: ink 3 tops out at 4,94:1 on
# the night ground and drops to 4,2 as soon as any image luminance survives the
# scrim — under the threshold, on the one block the whole apparatus of gates exists
# to protect. Ink 3 stays for what is not text: rules, watermark, separators.
ANNEXE_OPACITE = 0.88
SOURCE_OPACITE = 0.92

# §3 — the maximum measures, in px at k = 1, that keep the rag under control.
MESURE = {"precision": 800, "punchline": 880, "corps": 740, "credit": 820}

# §9 — the entry, read from the charter rather than chosen. An opacity and a short
# translation, on the arrival curve. No scale, no rotation, no bounce: the charter
# reserves the spring for what arrives on screen, and a block of text arriving is
# exactly that case.
ENTREE_DUREE = tk.duree("slow")
ENTREE_COURBE = tk.courbe("spring")
ENTREE_TRANSLATION = 28          # px at k = 1, upward

# §9 — below this a caption stops being readable at arm's length on a phone, and
# the honest answer is a shorter sentence rather than smaller type.
SOUS_TITRE_PLANCHER = 30

# §9 — the subtitle band, when a reel carries burned captions.
BANDE_SOUS_TITRE = 190

FACES = {"anton": "Anton-Regular.ttf", "nunito": "NunitoSans.ttf"}


# ------------------------------------------------------------------ geometry


@dataclass
class Bloc:
    """One placed thing. `texte` empty means it is a surface, not a string."""
    nom: str
    x: int
    y: int
    w: int
    h: int
    texte: str = ""
    couleur: str = ""
    corps: int = 0
    face: str = "nunito"
    graisse: int = 400
    lignes: tuple = ()
    interligne: float = 1.0
    aligne: str = "gauche"
    # When the block arrives, in seconds from the start of its scene, and whether
    # it is there from the first frame to the last. Meaningless on a still card,
    # where everything is permanent at t = 0.
    entree: float = 0.0
    permanent: bool = True
    # §3 — the annexe's discretion comes from its size and its place, and from an
    # opacity applied when it is painted. Never from a duller ink: the plan keeps
    # declaring a charter colour, so the « no invented colour » guard still reads a
    # token here rather than a blend it cannot recognise.
    opacite: float = 1.0
    # §10 — one word of this block painted in the accent instead of its own ink.
    # The title names the pair's two camps in the pair's order, so the colour tells
    # the reader which side a word belongs to.
    mot_accent: str = ""
    # §9 bis — the word index from which the accent takes over to the end of the
    # block. A closing's punch runs across a line break — « ELLE LE / TRAVERSE. » —
    # so it cannot be matched inside a line; what is matched is the position.
    accent_depuis: int = -1


@dataclass
class Plan:
    disposition: str
    ecart_regle: str = ""
    blocs: list = field(default_factory=list)
    # Layout faults the composition could not resolve. Never empty silently: a
    # card that does not fit is a card somebody has to shorten.
    fautes: list = field(default_factory=list)
    # Whether the column had to give up type to fit. §6 reads it: a column that
    # only holds once shrunk did not hold.
    comprime: bool = False

    def bloc(self, nom):
        return next((b for b in self.blocs if b.nom == nom), None)


_fontes = {}


def fonte(face, taille, graisse=400):
    cle = (face, taille, graisse)
    if cle not in _fontes:
        f = ImageFont.truetype(str(tk.font_file(FACES[face])), taille)
        if face == "nunito":
            # Nunito ships variable and its default instance is a wisp.
            f.set_variation_by_axes(
                [graisse if a["name"] in ("Weight", b"Weight") else a["default"]
                 for a in f.get_variation_axes()])
        _fontes[cle] = f
    return _fontes[cle]


_mesureur = ImageDraw.Draw(Image.new("RGB", (8, 8)))


def _envelopper(texte, face, taille, graisse, largeur_max):
    """Greedy wrap. The copy is validated word for word and is never shortened."""
    if not texte:
        return []
    f = fonte(face, taille, graisse)
    lignes, courante = [], ""
    for mot in texte.split():
        essai = f"{courante} {mot}".strip()
        if _mesureur.textlength(essai, font=f) <= largeur_max or not courante:
            courante = essai
        else:
            lignes.append(courante)
            courante = mot
    if courante:
        lignes.append(courante)
    return lignes


def _hauteur(lignes, taille, interligne):
    return round(len(lignes) * taille * interligne) if lignes else 0


def _theme(deck):
    return deck.get("fond", "nuit")


def _encre(deck, rang):
    """Ink 1, 2 or 3 for the deck's ground."""
    if _theme(deck) == "nuit":
        return tk.color({1: "--afh-night-ink", 2: "--afh-night-ink-2",
                         3: "--afh-night-ink-3"}[rang])
    return tk.color("--afh-color-text" if rang == 1 else "--afh-color-text-soft")


def _accent(deck):
    return tk.accent(deck.get("accent", "ocre"), _theme(deck))


def _fond(deck):
    return tk.color("--afh-night-ground" if _theme(deck) == "nuit" else "--afh-color-bg")


def _role_type(nom, fmt_key):
    """A §3 row, already multiplied by the format's k."""
    r = tk.type_role(nom)
    k = tk.fmt(fmt_key)["k"]
    return {
        "corps": max(1, round(r["corps"] * k)),
        "interligne": r["interligne"] or 1.15,
        "graisse": int(r["graisse"] or 400),
        "face": "anton" if "Anton" in (r["police"] or "") else "nunito",
    }


# The order a scene is read in, which is not the order the code builds it.
# A block never arrives before the one it explains: the precision explains the
# figure, the body explains the punchline. Anything absent is skipped without
# leaving a hole in the rhythm.
# `couple` is the pair block of §3 bis, matched on its cells' shared prefix. It
# was listed here as `plaque`, the name it carried before §10 renamed the field —
# so after the rename no pair entered with the cadence any more: the whole block
# was permanent from frame 1, silently.
ORDRE_LECTURE = ("chiffre", "titre", "precision", "couple", "punchline", "corps", "source")

# Permanent from the first frame. In video a credit is not a footer: it is a legal
# mention, and a mention that appears at the end of a scene nobody watches to the
# end has not been shown.
PERMANENTS = ("fond", "bande-image", "voile-bandeau", "voile-rampe", "voile-colonne",
              "voile-bande", "entete-bandeau", "entete-rang", "bande-sous-titre",
              "appel-action", "defilement")


def _bezier(x, points, iterations=6):
    """y of a CSS cubic-bezier at x, by bisection.

    Bisection rather than a closed form: the curve is evaluated a few thousand
    times per render, six halvings put the error well under a pixel, and nobody
    has to trust an inverted cubic.
    """
    if not points:
        return x
    x1, y1, x2, y2 = points
    lo, hi = 0.0, 1.0
    for _ in range(iterations):
        t = (lo + hi) / 2
        u = 1 - t
        bx = 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t
        if bx < x:
            lo = t
        else:
            hi = t
    t = (lo + hi) / 2
    u = 1 - t
    return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t


def avancement(bloc, instant):
    """How far into its entry a block is at this instant: 0 absent, 1 arrived."""
    if bloc.permanent or instant is None:
        return 1.0
    if instant < bloc.entree:
        return 0.0
    ecoule = (instant - bloc.entree) / ENTREE_DUREE
    return 1.0 if ecoule >= 1 else _bezier(ecoule, ENTREE_COURBE)


def cadencer(p, duree, sans_animation=False):
    """Stamp an entry instant on every block of a plan.

    The last block must have arrived well before the scene ends — a line that
    lands on the closing frame is a line nobody reads. So the staggering is fitted
    to the room available rather than fixed, and never exceeds it.
    """
    for bloc in p.blocs:
        bloc.entree = 0.0
        bloc.permanent = True

    if sans_animation or not duree:
        return p

    entrants = [b for b in p.blocs
                if b.nom.split("-")[0] in ORDRE_LECTURE or b.nom in ORDRE_LECTURE]
    entrants.sort(key=lambda b: ORDRE_LECTURE.index(
        b.nom if b.nom in ORDRE_LECTURE else b.nom.split("-")[0]))
    if not entrants:
        return p

    # §9 — the first content block joins the permanents. Frame 1 is the thumbnail:
    # it decides whether anyone watches, and it circulates in the feed far longer
    # than it lasts in playback. A thumbnail whose text has not arrived is a
    # thumbnail with no hook.
    entrants = entrants[1:]
    if not entrants:
        return p

    # Everything is on screen by two thirds of the scene, so the last arrival has
    # a third of the scene left to be read in.
    fenetre = max(0.0, duree * 0.66 - ENTREE_DUREE)
    pas = fenetre / max(1, len(entrants) - 1) if len(entrants) > 1 else 0.0

    for i, bloc in enumerate(entrants):
        bloc.entree = round(i * pas, 3)
        bloc.permanent = False
    return p


_TIENT = {}


def colonne_A_tient(carte, deck, fmt_key, *, image):
    """§6 — whether the card's column actually holds in a full-frame layout.

    **It measures, it does not count.** The column is composed — title, pair, body,
    source, credit, watermark — with the font that will draw it, and the result is
    checked to sit between the scrim and the bottom margin *and* to keep every
    block's contrast threshold.

    A character count is an approximation of that measurement, and a poor one: 199
    characters on two short lines hold where 185 on four lines do not. Same family
    of fault as a subtitle ceiling counted in characters instead of measured in
    pixels — which is where the lesson was first learned, and then left as a count
    everywhere else.

    The ground is painted because contrast is a property of the pixels under the
    text, not of the plan. `fond_et_plan` stops before the text, so this costs one
    scrim pass rather than a full render.

    Memoised on the card's own content: a plan costs 28 ms without the trial and
    314 ms with it, and the driver plans each card four times over — for the quota,
    for the report's distribution, for its own row, and for the render.
    """
    cle = (fmt_key, image.size, deck.get("fond"), deck.get("accent"),
           deck.get("serie"), deck.get("licence_sortie"),
           json.dumps(carte, sort_keys=True, ensure_ascii=False, default=str))
    if cle not in _TIENT:
        _, essai = fond_et_plan(carte, deck, fmt_key, image=image, disposition="A")
        _TIENT[cle] = not essai.fautes and not essai.comprime
    return _TIENT[cle]


# ------------------------------------------------------------------ the plan


def plan(carte, deck, fmt_key, *, image, sous_titre=False, disposition=None):
    """Geometry only. Nothing is drawn, so everything can be asserted.

    `disposition` forces a layout without consulting §6 at all. The fit trial §6
    runs is itself a plan, so without this the rule would call itself.
    """
    cadre = tk.fmt(fmt_key)
    W, H, k = cadre["w"], cadre["h"], cadre["k"]

    if disposition is not None:
        ecart = ""
    else:
        regle = tk.choisir(
            carte, w=image.width, h=image.height, fmt_key=fmt_key, image=image,
            tient=lambda: colonne_A_tient(carte, deck, fmt_key, image=image))
        demande = (carte.get("disposition") or "auto").upper()
        disposition = regle if demande in ("AUTO", "") else demande
        ecart = regle if disposition != regle else ""

    p = Plan(disposition=disposition, ecart_regle=ecart)

    marge = round(84 * k)
    marge_haute = marge + (40 if H == 1920 else 0)
    marge_basse = cadre["marge_basse"]

    # ── 1. the ground, then the image ────────────────────────────────────────
    p.blocs.append(Bloc("fond", 0, 0, W, H))

    # A dict of caption content, or a bare True to reserve the band without
    # filling it. Either way its truthiness is what opens the band.
    sous_titre_actif = bool(sous_titre) and H == 1920
    if disposition == "A":
        bande_h = H                       # full frame
    elif disposition == "B":
        bande_h = round(H * BANDE_B)
    else:
        bande_h = round(H * (BANDE_C_SOUS_TITRE if sous_titre_actif else BANDE_C))
    p.blocs.append(Bloc("bande-image", 0, 0, W, bande_h))

    # ── 2. the banner plate, on banded layouts only ──────────────────────────
    # §4 — **a full-frame card carries ONE scrim, never two.** A banner plate and
    # a column scrim written separately both fade to 0 in the gap between them:
    # their alphas cancel and the photograph comes back at full brightness across
    # the whole width. Measured on the 9:16 opening — alpha 0,95 at y = 0, 0,00 at
    # y = 400, 0,78 at y = 700, the row luminance climbing to 225 and falling back
    # to 46. A 200-level excursion and return is not a gradient, it is a band.
    #
    # A banded card keeps its plate: its text sits on a flat, so there is no
    # second scrim for it to collide with.
    if disposition != "A":
        p.blocs.append(Bloc("voile-bandeau", 0, 0, W, VOILE_BANDEAU[H]))
    if disposition == "B":
        p.blocs.append(Bloc("voile-bande", 0, round(bande_h * 0.66), W, round(bande_h * 0.34)))

    # ── 3. banner and rank ───────────────────────────────────────────────────
    # §5A — on a full-frame card they are the column's first row, so they sit
    # under the one scrim like everything else. Pinned to the top of the card they
    # needed a plate of their own, which is the second scrim §4 forbids.
    if disposition != "A":
        for bloc in _entete(carte, deck, fmt_key, W - 2 * marge):
            bloc.x += marge
            bloc.y += marge_haute
            p.blocs.append(bloc)

    # ── 5. the content column ────────────────────────────────────────────────
    # Its top and its available height depend on the layout; its bottom is the
    # foot, which does not move.
    # The foot spans the content column in A and the full measure elsewhere, so
    # its width is known from the layout alone — before the column is placed.
    from ethni_brand import filigrane, FILIGRANE_PX
    marque = filigrane(round(FILIGRANE_PX * k), _rgb(_encre(deck, 3)))

    # One expression for the credit's measure, used by the reservation and by the
    # drawing. Two expressions is how the foot overshot twice: the height was
    # reserved at the full width and drawn at a width shortened for the mark.
    #
    # §7 bis — and that shortening is gone: the mark no longer sits beside the
    # credit, so the annexe gets the whole measure back.
    pleine = (W - 2 * round(A_INSET_X * k)) if disposition == "A" else (W - 2 * marge)
    pied_w = pleine
    pied_h = (_hauteur_pied(carte, deck, fmt_key, pied_w)
              + round(FILIGRANE_GOUTTIERE * k) + marque.height)
    bande_st = round(BANDE_SOUS_TITRE * k) if sous_titre_actif else 0

    pied_y = H - marge_basse - pied_h

    # §8 — the pastille is furniture with a height, so it is measured here and
    # subtracted from the column's budget. Placed afterwards it simply sat on
    # whatever was already there.
    # §8 — the exit gesture, on the card that closes the deck. It was planned only
    # when a card declared an `appel`, and none does, so it never drew: the
    # address ended up glued to the end of a body sentence instead.
    appel = carte.get("appel") or (APPEL_DEFAUT if carte.get("role") == "bascule" else None)
    # §8 — « couverture de carrousel uniquement ». A reel is not swiped.
    defilement = not appel and carte.get("role") == "ouverture" and fmt_key == "carrousel"
    appel_h = round(27 * k + 40) + round(GOUTTIERE * k) if appel else 0
    if defilement:
        appel_h = round(40 * k * 1.2) + round(GOUTTIERE * k)

    colonne_bas = pied_y - round(GOUTTIERE_CREDIT * k) - bande_st - appel_h

    if disposition == "A":
        colonne_x = round(A_INSET_X * k)
        colonne_w = W - 2 * colonne_x
        aligne = "gauche"
        colonne_haut = None                       # packed up from the bottom
    elif disposition == "B":
        colonne_x, colonne_w = marge, W - 2 * marge
        aligne = "centre"
        # §5B — « colonne centrée entre la bande et le pied ». Packed from the top
        # instead, it leaves the hole §0.2 names as the previous gabarit's most
        # visible fault: a block floating high, then three hundred px of nothing.
        colonne_haut = "centre"
    else:
        colonne_x, colonne_w = marge, W - 2 * marge
        aligne = "centre"
        # §5C — the text sits inside the flat, which starts under the band.
        colonne_haut = bande_h + round(GOUTTIERE * k)

    contenu = _colonne(carte, deck, fmt_key, colonne_w, disposition, k)

    # The column is compressible and the foot is not. §9: when a subtitle band is
    # active in 9:16 the content gives up its height, never the foot — a foot
    # pushed down lands under the platform interface and takes the attribution
    # obligation with it.
    gouttiere = round(GOUTTIERE * k)
    def hauteur_totale(bl):
        items = _flux(bl)
        return (sum(_etendue(i)[0] for i in items)
                + gouttiere * max(0, len(items) - 1))

    haut_total = hauteur_totale(contenu)

    # Where the column may live, and therefore how much it may take.
    plafond = bande_h + gouttiere if disposition != "A" else marge_haute * 2
    dispo = colonne_bas - plafond
    if haut_total > dispo:
        # §6 — the column had to give up type to fit, so it did not hold at the
        # sizes §3 sets. `colonne_A_tient` reads this: without it the fit trial
        # always succeeded, because compression can always shrink something.
        p.comprime = True
        contenu, tient = _comprimer(contenu, dispo, gouttiere)
        haut_total = hauteur_totale(contenu)
        if not tient:
            # §11 — a block that overflows is a layout fault, never something to
            # let overlap. The column is clipped to its box so nothing collides,
            # and the fault is named so the render report can carry it.
            p.fautes.append(
                f"la colonne demande {haut_total} px pour {dispo} px disponibles en "
                f"{disposition}/{fmt_key} — raccourcis le corps, ou passe la carte "
                f"en deux")
            while contenu and hauteur_totale(contenu) > dispo:
                retire = contenu.pop()
                p.fautes.append(f"« {retire.nom} » n'a pas été composé, faute de place")
            haut_total = hauteur_totale(contenu)

    if colonne_haut == "centre":
        y = plafond + max(0, (dispo - haut_total)) / 2
    elif colonne_haut is None:
        y = colonne_bas - haut_total          # A packs up from the foot
    else:
        y = colonne_haut
    # The same flow the height was measured on, walked once. Deriving the units a
    # second time here is how the measure and the placement drift apart.
    for item in _flux(contenu):
        groupe, blocs_item = item
        haut, large = _etendue(item)
        if groupe is None:
            bloc = blocs_item[0]
            bloc.aligne = aligne
            bloc.x = (colonne_x if aligne == "gauche"
                      else colonne_x + (colonne_w - bloc.w) // 2)
            bloc.y = round(y)
        else:
            # §3 bis — in a centred layout the whole unit is centred while each of
            # its columns stays left-aligned: the internal alignment is what makes
            # a pair read, not the centring.
            origine_x = (colonne_x if aligne == "gauche"
                         else colonne_x + (colonne_w - large) // 2)
            for bloc in blocs_item:
                bloc.x += origine_x
                bloc.y = round(y + bloc.y)
        p.blocs.extend(blocs_item)
        y += haut + gouttiere

    # §4 — the one scrim, written as a relation and not as an ordinate. The flat is
    # the column's own box, edge to edge and down to the bottom of the card; the
    # ramp sits directly above it, `bottom:100%`. Both follow the column when the
    # column grows, which is what an estimated height does not do.
    #
    # Twice this went wrong by describing in ordinates what has to be described in
    # relations: anchored on the first block's mid-height, correct for one line and
    # wrong for a five-line title whose first line lands 290 px higher at alpha
    # 0,07; then anchored on a hand-summed content top, invalidated by the very
    # edit that added a row to the column — 278 px out in 9:16, banner at 1,09:1.
    if disposition == "A":
        haut_colonne = min((b.y for b in p.blocs if b.texte), default=H)
        p.blocs.append(Bloc("voile-colonne", 0, haut_colonne, W, H - haut_colonne))
        rampe_h = round(RAMPE * k)
        p.blocs.append(Bloc("voile-rampe", 0, max(0, haut_colonne - rampe_h), W,
                            min(rampe_h, haut_colonne)))

    if bande_st:
        p.blocs.append(Bloc("bande-sous-titre", marge, pied_y - round(GOUTTIERE_CREDIT * k) - bande_st,
                            W - 2 * marge, bande_st))

    # §8 — the two cues say opposite things and never share a card: the scroll cue
    # says *continue*, the pastille says *leave*. They take the same slot, in the
    # gap their own height opened between the column and the band.
    plancher = pied_y - round(GOUTTIERE_CREDIT * k) - bande_st
    if appel:
        largeur = round(_mesureur.textlength(
            appel.upper(), font=fonte("nunito", round(27 * k), 800)) + 76)
        hauteur = round(27 * k + 40)
        p.blocs.append(Bloc(
            "appel-action", (W - largeur) // 2, plancher - hauteur,
            largeur, hauteur, appel.upper(), _accent(deck), round(27 * k),
            "nunito", 800, (appel.upper(),), 1.3, "centre"))
    elif defilement:
        # §7 ter — the opening's fourth block. Written at the end of the body it
        # was a sentence; a gesture is furniture, like the pastille, and §8 gives
        # it its own type and its own three chevrons.
        t = round(DEFILEMENT_CORPS * k)
        f = fonte("nunito", t, 800)
        largeur = round(_mesureur.textlength(DEFILEMENT.upper(), font=f)
                        * (1 + DEFILEMENT_INTERLETTRE))
        chevrons = round(_mesureur.textlength("›››", font=fonte("anton", round(40 * k))) * 1.8)
        hauteur = round(40 * k * 1.2)
        p.blocs.append(Bloc(
            "defilement", (W - largeur - chevrons) // 2, plancher - hauteur,
            largeur + chevrons, hauteur, DEFILEMENT.upper(), _accent(deck), t,
            "nunito", 800, (DEFILEMENT.upper(),), 1.3))

    # ── 6. the foot ──────────────────────────────────────────────────────────
    # §5A: the credit rides in the content column, sharing its x. Two independent
    # bottom anchors telescope the moment a line is added.
    pied_x = colonne_x if disposition == "A" else marge
    pied_aligne = "gauche" if disposition == "A" else aligne
    bas_credit = pied_y
    for bloc in _pied(carte, deck, fmt_key, pied_w, pied_aligne):
        bloc.aligne = pied_aligne
        bloc.x = pied_x if disposition == "A" else pied_x + (pied_w - bloc.w) // 2
        bloc.y = pied_y + bloc.y
        p.blocs.append(bloc)
        bas_credit = max(bas_credit, bloc.y + bloc.h)

    # §7 bis — under the credit, centred on the credit block's measure. Set beside
    # it, the mark squeezed the annexe onto the left half of the frame and put
    # rank 5 at rank 1 by size alone. Under it, the annexe re-centres and the
    # watermark closes the card instead of disputing it.
    #
    # Planned rather than stamped, so it sits inside the overflow check like every
    # other block — the mark went unplanned and unpainted for four chantiers, and
    # no test could see it.
    p.blocs.append(Bloc("filigrane", pied_x + (pied_w - marque.width) // 2,
                        bas_credit + round(FILIGRANE_GOUTTIERE * k),
                        marque.width, marque.height))

    return p


def _colonne(carte, deck, fmt_key, largeur, disposition, k):
    """The content blocks, in reading order, sized but not yet placed."""
    blocs = []
    accent, encre1, encre2 = _accent(deck), _encre(deck, 1), _encre(deck, 2)

    def ajouter(nom, texte, role, couleur, mesure=None, majuscule=False, coupe=None):
        if not texte:
            return
        t = _role_type(role, fmt_key)
        contenu = texte.upper() if majuscule else texte
        large = min(largeur, round(MESURE.get(mesure, 10_000) * k)) if mesure else largeur

        if coupe:
            # §10 — a cut that carries meaning. The three cards that use one are
            # enumerations where the break keeps the groups from mixing, and the
            # engine must not re-wrap them on measure. Everywhere else `coupe` is
            # null: a break placed for looks goes stale at the first format change.
            lignes = [l.upper() if majuscule else l for l in coupe]
        else:
            lignes = _envelopper(contenu, t["face"], t["corps"], t["graisse"], large)
        if not lignes:
            return
        w = max(round(_mesureur.textlength(l, font=fonte(t["face"], t["corps"], t["graisse"])))
                for l in lignes)
        # A forced cut is honoured, not trusted: a line wider than the column
        # still has to shrink, or it leaves the frame silently.
        if coupe and w > large:
            t = dict(t, corps=max(1, round(t["corps"] * large / w)))
            w = max(round(_mesureur.textlength(l, font=fonte(t["face"], t["corps"], t["graisse"])))
                    for l in lignes)
        blocs.append(Bloc(nom, 0, 0, min(w, large), _hauteur(lignes, t["corps"], t["interligne"]),
                          contenu, couleur, t["corps"], t["face"], t["graisse"],
                          tuple(lignes), t["interligne"]))

    # §5A — the banner and the rank are the column's first row on a full-frame
    # card, so the one scrim covers them like everything else.
    if disposition == "A":
        blocs.extend(_entete(carte, deck, fmt_key, largeur))

    # §10 — the title's ink is 1, and the accent is spent on the camp `titre_camps`
    # names. Without that field the title is one flat ink, which is correct and only
    # less telling; with it, the colour becomes a reading key rather than a
    # decoration — « un mot *angolais* devenu *brésilien* », in the pair's own order.
    camps = carte.get("titre_camps") or {}
    if carte.get("chiffre"):
        ajouter("chiffre", carte.get("titre", ""), "Chiffre / mot d'accent", accent)
        ajouter("precision", carte.get("precision", ""), "Précision", encre1, "precision")
    else:
        # §5A — a full-frame card's title is « titre Anton 96–118 », the series row;
        # the cover row's 120–126 belongs to a banded card. It matters now that
        # §7 ter makes an opening title a whole sentence: at 120 the Familles-Bantu
        # opening ran to five lines and 610 px, and the column held only by giving
        # up type — which §6 reads, rightly, as not holding.
        ajouter("titre", carte.get("titre", ""),
                "Titre de série" if disposition == "A" else "Titre de couverture",
                encre1, majuscule=True, coupe=carte.get("coupe"))
        titre = next((b for b in blocs if b.nom == "titre"), None)
        if titre is not None and camps.get("deux"):
            titre.mot_accent = camps["deux"]
        ajouter("precision", carte.get("precision", ""), "Précision",
                encre2 if disposition == "B" else encre1, "precision")

    # §3 bis — the pair block. It is present on a still card too, and it enters
    # with the cadence like any other block of composition.
    if carte.get("paires"):
        _ajouter_couple(blocs, carte["paires"], fmt_key, largeur,
                        accent, encre1, encre2, k)

    ajouter("punchline", carte.get("punchline", ""), "Punchline", encre1, "punchline", majuscule=True)
    ajouter("corps", carte.get("corps", ""), "Corps", encre2, "corps")
    # §3 — the source is rank 5, so it takes ink 2 like the credit. Set in ink 3 it
    # measured 4,39:1 against a 4,5 threshold — the ceiling §3 records, on the other
    # half of the annexe. Ink 3 is for what is not text.
    ajouter("source", carte.get("source", ""), "Source", encre2, majuscule=True)
    source = next((b for b in blocs if b.nom == "source"), None)
    if source is not None:
        source.opacite = SOURCE_OPACITE
    return blocs


# §3's sizes are ranges, so type may give way — but only so far. Below this a
# body stops being readable at arm's length on a phone, and the honest answer is
# a shorter card, not smaller type.
CORPS_PLANCHER = 15


def _ajouter_couple(blocs, paire, fmt_key, largeur, accent, encre1, encre2, k):
    """§3 bis — two names for one thing, laid out so the equivalence is visible.

    The autonym against the exonym, the original word against the word that took
    its place, is the atlas's subject. The block has to *show* the equivalence, not
    stack two words.

    **Horizontal is the only form**: two columns side by side, each term above its
    own gloss, the arrow in accent in the gutter. The arrow is mandatory — it says
    the derivation, that this word became that one, and two words set with no sign
    of relation are just two words set. And each gloss belongs to its own term:
    fused on one line behind a middot, « un campement de guerre, en Angola · au
    Brésil » asks the reader to redistribute what the grid can simply show.

    **The first term takes ink 1 and the second the accent**, so the title naming
    the two camps in the same order — « un mot *angolais* devenu *brésilien* » —
    turns colour into a reading key rather than a decoration.

    Vertical is the fallback and only that: when a term will not fit its column.
    Horizontal costs 170 px against the vertical's 279, and on a flat where nothing
    can compress, those 109 px are the difference between a visible credit and a
    credit outside the frame.
    """
    tt = _role_type("Paire — terme", fmt_key)
    tg = _role_type("Paire — glose", fmt_key)

    # §10 — a list of two to four {terme, glose} couples. The colour is positional,
    # so no field says which term takes the accent: the first carries ink 1, the
    # last the accent, and any middle term stays in ink 1.
    membres = [{"text": (m or {}).get("terme", ""), "gloss": (m or {}).get("glose") or ""}
               for m in paire]
    encres = [encre1] * len(membres)
    if len(membres) > 1:
        encres[-1] = accent

    colonne = round(COUPLE_COLONNE * k)
    gouttiere = round(COUPLE_GOUTTIERE * k)
    n = max(1, len(membres))
    if n * colonne + (n - 1) * gouttiere > largeur:
        colonne = max(1, (largeur - (n - 1) * gouttiere) // n)

    def cellules(membre, largeur_max):
        """A term's lines and its gloss's, wrapped to one column."""
        return (_envelopper(membre.get("text", ""), tt["face"], tt["corps"],
                            tt["graisse"], largeur_max),
                _envelopper(membre.get("gloss") or "", tg["face"], tg["corps"],
                            tg["graisse"], largeur_max))

    def mesure(lignes, t):
        police = fonte(t["face"], t["corps"], t["graisse"])
        return max((round(_mesureur.textlength(l, font=police)) for l in lignes),
                   default=0)

    plie = [cellules(m, colonne) for m in membres]

    # §3 bis — the fallback, and the one thing that triggers it: a term that will
    # not fit its column. A term wraps to two lines happily; one *word* wider than
    # the column is what has no horizontal answer.
    deborde = any(
        mesure([mot], tt) > colonne
        for (termes, _), m in zip(plie, membres)
        for mot in (m.get("text", "") or "").split())

    fleche_t = dict(tt, face="anton")
    signe = "↓" if deborde else "→"
    police_f = fonte("anton", fleche_t["corps"])
    fw = round(_mesureur.textlength(signe, font=police_f))
    fh = round(fleche_t["corps"] * 1.15)

    def poser(nom, lignes, t, couleur, x, y, large):
        if not lignes:
            return 0
        h = _hauteur(lignes, t["corps"], t["interligne"])
        blocs.append(Bloc(nom, x, y, min(mesure(lignes, t), large), h,
                          " ".join(lignes), couleur, t["corps"], t["face"],
                          t["graisse"], tuple(lignes), t["interligne"]))
        return h

    interne = round(GOUTTIERE * k * 0.4)

    if not deborde:
        # Every gloss starts on the same line, under the tallest term: that shared
        # baseline is what makes the members read as objects of the same kind rather
        # than as a heading and a caption.
        hauts = [_hauteur(termes, tt["corps"], tt["interligne"]) for termes, _ in plie]
        y_glose = max(hauts) + interne
        for i, (termes, gloses) in enumerate(plie):
            x = i * (colonne + gouttiere)
            poser(f"couple-{i}-terme", termes, tt, encres[i], x, 0, colonne)
            poser(f"couple-{i}-glose", gloses, tg, encre2, x, y_glose, colonne)

            # One arrow per gutter. It is mandatory: without it two words set side
            # by side are just two words set side by side, and the block says
            # nothing about the derivation it exists to show.
            if i:
                blocs.append(Bloc(
                    f"couple-fleche-{i}",
                    i * (colonne + gouttiere) - gouttiere + (gouttiere - fw) // 2,
                    max(0, (max(hauts) - fh) // 2), fw, fh, signe, accent,
                    fleche_t["corps"], "anton", fleche_t["graisse"], (signe,), 1.15))
        return

    # Vertical fallback — term and gloss stacked and centred, the arrow between the
    # two groups. The gloss is centred under its own term, never spread across the
    # whole measure: a gloss occupying the full column while its term runs three
    # centimetres gives the annexe the weight of the subject.
    y = 0
    for i, (termes, gloses) in enumerate(plie):
        if i:
            blocs.append(Bloc(f"couple-fleche-{i}", (largeur - fw) // 2, y + interne,
                              fw, fh, signe, accent, fleche_t["corps"], "anton",
                              fleche_t["graisse"], (signe,), 1.15))
            y += fh + 2 * interne
        for nom, lignes, t, couleur in ((f"couple-{i}-terme", termes, tt, encres[i]),
                                        (f"couple-{i}-glose", gloses, tg, encre2)):
            h = poser(nom, lignes, t, couleur, 0, y, largeur)
            if h:
                # Centred on the measure, which is also the term's centre, so the
                # gloss sits under its own term rather than beside it.
                blocs[-1].w, blocs[-1].aligne = largeur, "centre"
                y += h + interne


def _entete(carte, deck, fmt_key, largeur):
    """§5A — the pillar and the rank, on one row, `space-between`.

    Two cells of one flow unit: the pillar left in ink 1, the rank right in the
    accent. They carry x and y relative to the row, so the row places as a whole
    wherever the layout puts it — inside the column on a full-frame card, at the
    top of the card on a banded one.

    **One line, never two.** `nowrap` and a 0,16em tracking: at 0,20em across
    872 px « EthniAfrica · Atlas des peuples d'Afrique » wraps and turns into a
    caption, which §3 forbids. The label shortens before the line breaks.
    """
    blocs = []
    t = _role_type("Bandeau", fmt_key)
    serie = (deck.get("serie") or deck.get("pilier") or "").upper()

    tr = _role_type("Rang", fmt_key)
    # §8 — « 01/05 » : the card and the total. The total is read off the deck and
    # never typed. A reader who cannot tell how much is left stops earlier.
    total = len(deck.get("cartes") or [])
    rang_txt = f"{carte['rang']:02d}/{total:02d}" if total else f"{carte['rang']:02d}"
    rang_w = round(_mesureur.textlength(
        rang_txt, font=fonte(tr["face"], tr["corps"], tr["graisse"])) * (1 + RANG_INTERLETTRE))
    haut = round(max(t["corps"], tr["corps"]) * 1.3)

    if serie:
        dispo = largeur - rang_w - round(GOUTTIERE * tk.fmt(fmt_key)["k"])
        # Shortened rather than wrapped, and shrunk rather than truncated: a
        # pillar cut mid-word says less than a pillar set a size down.
        while (round(_mesureur.textlength(serie, font=fonte(t["face"], t["corps"], t["graisse"]))
                     * (1 + BANDEAU_INTERLETTRE)) > dispo and t["corps"] > 1):
            t = dict(t, corps=t["corps"] - 1)
        w = round(_mesureur.textlength(serie, font=fonte(t["face"], t["corps"], t["graisse"]))
                  * (1 + BANDEAU_INTERLETTRE))
        blocs.append(Bloc("entete-bandeau", 0, 0, min(w, dispo), haut, serie,
                          _encre(deck, 1), t["corps"], t["face"], t["graisse"],
                          (serie,), 1.3))

    blocs.append(Bloc("entete-rang", largeur - rang_w, 0, rang_w, haut, rang_txt,
                      _accent(deck), tr["corps"], tr["face"], tr["graisse"],
                      (rang_txt,), 1.3))
    return blocs


def _flux(contenu):
    """The column's flow items, in order.

    A pair or a table is **one** item, not one per cell: its cells carry their x
    and y relative to the unit's own top-left, so the unit occupies one bounding
    box and takes one gutter.

    Counting the cells instead inflated the column by a whole pair's height plus a
    gutter per cell. Layout A packs up from the foot, so it started that much too
    high and left a void above the credit — visible on every card with a pair.
    """
    items, vus = [], {}
    for bloc in contenu:
        g = next((p for p in GROUPES if bloc.nom.startswith(p)), None)
        if g is None:
            items.append((None, [bloc]))
            continue
        if g not in vus:
            vus[g] = len(items)
            items.append((g, []))
        items[vus[g]][1].append(bloc)
    return items


def _etendue(item):
    """A flow item's bounding height and width."""
    blocs = item[1]
    return (max(b.y + b.h for b in blocs), max(b.x + b.w for b in blocs))


def _rangs_du_groupe(cellules):
    """A unit's rows, and where each cell sits inside its own row.

    Rows are found by overlap rather than by an equal y: the arrow of a pair is
    centred on the terms' height, so it shares their row without sharing their y.
    Each cell's position is kept as a fraction of the row's height, which is what
    survives a shrink — an absolute offset does not.
    """
    restants = sorted(cellules, key=lambda c: c.y)
    rangs = []
    for cellule in restants:
        for rang in rangs:
            bas = max(c.y + c.h for c in rang)
            if cellule.y < bas:
                rang.append(cellule)
                break
        else:
            rangs.append([cellule])

    plan = []
    for i, rang in enumerate(rangs):
        haut_rang = max(c.y + c.h for c in rang) - min(c.y for c in rang)
        sommet = min(c.y for c in rang)
        plan.append((rang, [(c.y - sommet) / haut_rang if haut_rang else 0.0
                            for c in rang]))

    ecarts = [min(b.y for b in rangs[i + 1]) - max(c.y + c.h for c in rangs[i])
              for i in range(len(rangs) - 1)]
    return plan, ecarts


def _restacker(plan, ecarts):
    """Re-stack a unit's rows after its cells were shrunk.

    Without this a compressed pair keeps offsets computed from the heights it had
    on the way in, and its gloss climbs into its own term.
    """
    y = 0
    for i, (rang, parts) in enumerate(plan):
        haut_rang = max(c.h for c in rang)
        for cellule, part in zip(rang, parts):
            cellule.y = round(y + part * haut_rang)
        y += haut_rang + (ecarts[i] if i < len(ecarts) else 0)


def _comprimer(blocs, dispo, gouttiere):
    """Shrink the content to fit. Returns the blocks and whether it succeeded.

    Proportional across every block rather than largest-first: shrinking only the
    tallest turns a figure card into a body card with a caption, and the
    hierarchy §3 sets is the thing worth preserving under pressure.

    The copy is never rewritten to fit a frame — that is why the frame's type is
    what gives way.
    """
    # Captured on the way in, from the geometry the builder produced. A unit's
    # cells carry offsets derived from their own heights, so once those heights
    # change the rows have to be laid again.
    groupes = [_rangs_du_groupe(blocs_item)
               for nom, blocs_item in _flux(blocs) if nom is not None]

    def hauteur(bl):
        items = _flux(bl)
        return (sum(_etendue(i)[0] for i in items)
                + gouttiere * max(0, len(items) - 1))

    for _ in range(60):
        if hauteur(blocs) <= dispo:
            return blocs, True
        if all(b.corps <= CORPS_PLANCHER for b in blocs):
            return blocs, False
        for b in blocs:
            if b.corps > CORPS_PLANCHER:
                b.corps = max(CORPS_PLANCHER, round(b.corps * 0.94))
                b.lignes = tuple(_envelopper(b.texte, b.face, b.corps, b.graisse, b.w))
                b.h = _hauteur(b.lignes, b.corps, b.interligne)
        for plan_groupe, ecarts in groupes:
            _restacker(plan_groupe, ecarts)
    return blocs, False


def sortie_mot(deck):
    """What the derivative is, for the licence line: a card, or a video."""
    return "vidéo" if deck.get("montage") else "carte"


def _lignes_credit(carte, deck):
    """§7 — three lines, and the third is ours."""
    im = carte.get("image", {})
    premiere = " · ".join(x for x in (im.get("credit"), im.get("depot")) if x)

    # §7 — the photograph's licence, then the card's own. When the lot inherits
    # the same licence the image carries, printing it twice says nothing and
    # reads as a mistake: « CC BY-SA 4.0 · CC BY-SA 4.0 ».
    licence = im.get("licence") or ""
    sortie = deck.get("licence_sortie") or ""
    # Two bare licences side by side read as an error. They are two different
    # obligations — the photograph's and the derivative's — so each says what it
    # covers, and the second is dropped entirely when it repeats the first.
    if sortie and sortie != licence:
        deuxieme = " · ".join(x for x in (f"image {licence}" if licence else "",
                                          f"{sortie_mot(deck)} {sortie}") if x)
    else:
        deuxieme = licence

    return [l for l in (premiere, deuxieme, "ethniafrica.com · @ethniafrica") if l]


def _pied(carte, deck, fmt_key, largeur, aligne):
    t = _role_type("Crédit", fmt_key)
    blocs, y = [], 0
    for i, ligne in enumerate(_lignes_credit(carte, deck)):
        lignes = _envelopper(ligne, t["face"], t["corps"], t["graisse"], largeur)
        h = _hauteur(lignes, t["corps"], t["interligne"])
        w = max(round(_mesureur.textlength(l, font=fonte(t["face"], t["corps"], t["graisse"])))
                for l in lignes) if lignes else 0
        blocs.append(Bloc(f"credit-{i}", 0, y, min(w, largeur), h, ligne,
                          _encre(deck, 2), t["corps"], t["face"], t["graisse"],
                          tuple(lignes), t["interligne"], opacite=ANNEXE_OPACITE))
        y += h
    return blocs


def _hauteur_pied(carte, deck, fmt_key, largeur):
    """The foot's height at the width it will actually be drawn at.

    Measured at 10 000 px it never wrapped, so a credit long enough for a second
    line overflowed its reservation by exactly one line and pushed the foot past
    the bottom margin — the §0.2 defect, visible on every card whose credit runs
    long.
    """
    return sum(b.h for b in _pied(carte, deck, fmt_key, largeur, "gauche"))



# ------------------------------------------------------------- §9 bis video


# §9 bis — the four slots, in pixels of a 1080 × 1920 frame. They are **fixed**:
# a position never changes because another block appeared or disappeared. A title
# that drops when the subtitle clears reads as a rendering fault.
V_SERIE_Y = 131
V_TITRE = (1050, 220)          # top, height — bottom-anchored
V_NARRATION = (1300, 190)      # reserved even when empty
V_CREDIT_BAS = 44
# The closing is the one exception: a taller title slot, and a bottom slot deep
# enough to carry the plate *and* the pastille.
V_TITRE_CLOTURE = (890, 380)
V_BAS_CLOTURE = 270

# §9 bis — the two scrims. The profile is deliberately not monotone: 0,95 at the
# top, 0 in the middle, 0,93 at the base. That is licit **because no text lives in
# the gap** — the bright band there is the image, which is the subject. §11's
# monotonicity check is the carousel's; the video check is that no text block falls
# between the two.
V_PLAQUE_H = 340
V_PLAQUE_PLATEAU = 0.52        # the plateau has to cover the label at y = 131
V_PLAQUE_ARRETS = ((0.00, 0.95), (V_PLAQUE_PLATEAU, 0.93), (1.00, 0.00))
V_VOILE_HAUT = 840
V_VOILE_HAUT_CLOTURE = 590     # the closing's taller title moves the ramp up
# Ordinates, not fractions: they are read against the frame and converted once.
V_VOILE_ARRETS = ((840, 0.00), (1050, 0.72), (1198, 0.82), (1450, 0.88), (1920, 0.93))

# §9 bis — the type. The subtitle is 52 px because at 44 it reads badly on a phone
# held at arm's length.
V_TITRE_CORPS = 76
V_TITRE_CLOTURE_CORPS = 80
V_PRECISION_CORPS = 34
V_SOUS_TITRE_CORPS = 52
V_CREDIT_CORPS = 17
V_FILIGRANE_OPACITE = 0.72     # on a night flat at 0,93, 0,55 would go out
V_MARGE_X = 96

# §9 bis — the closing's bottom slot. The vision is **set**, not spoken, so it
# takes §3's own « Sous-titre narration » rank at its written size: the 52 px of
# §9 bis is a concession to a caption read at arm's length while it is being
# said, and this line is not going anywhere. The plate keeps §9's padding.
V_VISION_CORPS = 44
V_VISION_INTERLIGNE = 1.30
V_PLAQUE_MARGE = (32, 22)
# §8's pastille, unchanged: the reel does not get a second set of numbers.
V_PASTILLE_CORPS = 27
V_PASTILLE_PADDING = (20, 38)


def _v_alpha(y, cloture=False):
    """The scrim's alpha at an ordinate, by §9 bis's own stops."""
    decalage = V_VOILE_HAUT_CLOTURE - V_VOILE_HAUT if cloture else 0
    arrets = [(y0 + decalage if y0 < 1920 else y0, a) for y0, a in V_VOILE_ARRETS]
    if y <= arrets[0][0]:
        return 0.0
    for (y0, a0), (y1, a1) in zip(arrets, arrets[1:]):
        if y0 <= y <= y1:
            return a0 + (a1 - a0) * (y - y0) / max(1, y1 - y0)
    return arrets[-1][1]


def _v_poser(blocs, nom, texte, corps, face, graisse, couleur, x, largeur,
             interligne=1.12, majuscule=False, lignes_max=None):
    """One text block, wrapped to the slot's measure. Returns it or None."""
    if not (texte or "").strip():
        return None
    contenu = texte.upper() if majuscule else texte
    lignes = _envelopper(contenu, face, corps, graisse, largeur)
    if lignes_max:
        lignes = lignes[:lignes_max]
    w = max(round(_mesureur.textlength(l, font=fonte(face, corps, graisse)))
            for l in lignes)
    bloc = Bloc(nom, x, 0, min(w, largeur), _hauteur(lignes, corps, interligne),
                contenu, couleur, corps, face, graisse, tuple(lignes), interligne)
    blocs.append(bloc)
    return bloc


def plan_video(carte, deck, *, image, sous_titre=False):
    """§9 bis — the video plan. One layout, flush left, four fixed slots.

    `sous_titre` only decides whether the narration slot is *filled*. The slot is
    reserved either way: an empty slot costs nothing and guarantees nothing moves.
    """
    W, H = 1080, 1920
    p = Plan(disposition="A")
    role = carte.get("role")
    cloture = role == "bascule"
    ouverture = role == "ouverture"

    p.blocs.append(Bloc("fond", 0, 0, W, H))
    p.blocs.append(Bloc("bande-image", 0, 0, W, H))      # full frame, every frame

    # ── the two scrims ───────────────────────────────────────────────────────
    p.blocs.append(Bloc("voile-plaque", 0, 0, W, V_PLAQUE_H))
    haut = V_VOILE_HAUT_CLOTURE if cloture else V_VOILE_HAUT
    p.blocs.append(Bloc("voile-bas", 0, haut, W, H - haut))

    encre1, encre2 = _encre(deck, 1), _encre(deck, 2)
    accent = _accent(deck)
    largeur = W - 2 * V_MARGE_X

    # ── the series name, opening and closing only ────────────────────────────
    # One does not leaf through a video, so there is no rank; and the series name
    # on every keyframe is one of the nine defects the port produced.
    if ouverture or cloture:
        # §7 ter — the closing is constant across every series, so it cannot carry
        # a per-series label: the image every series ends on would name one of
        # them. It carries the brand line instead, read off `ethni_brand` rather
        # than typed here, because two spellings of one name are two that drift.
        from ethni_brand import TAGLINE
        libelle = (f"EthniAfrica · {TAGLINE}" if cloture
                   else (deck.get("serie") or deck.get("pilier") or "")).upper()
        t = _role_type("Bandeau", "reel")
        bloc = _v_poser(p.blocs, "v-serie", libelle, t["corps"], t["face"],
                        t["graisse"], encre1, V_MARGE_X, largeur)
        if bloc is not None:
            bloc.y = V_SERIE_Y

    # ── the title slot ───────────────────────────────────────────────────────
    # §4 — at 0,72 the gold does not survive, so the display is in ink 1, figure
    # included. The accent is not lost: it moves into the narration plate.
    alpha_titre = _v_alpha(V_TITRE_CLOTURE[0] if cloture else V_TITRE[0], cloture)
    encre_titre = tk.encre_affichage(alpha_titre, accent, encre1)

    haut_slot, h_slot = V_TITRE_CLOTURE if cloture else V_TITRE
    slot = []
    if carte.get("chiffre"):
        _v_poser(slot, "v-chiffre", carte.get("titre", ""), 150, "anton", 400,
                 encre_titre, V_MARGE_X, largeur, interligne=1.0)
        _v_poser(slot, "v-precision", carte.get("precision", ""), V_PRECISION_CORPS,
                 "nunito", 600, encre1, V_MARGE_X, largeur, interligne=1.3)
    else:
        corps = V_TITRE_CLOTURE_CORPS if cloture else V_TITRE_CORPS
        titre = _v_poser(slot, "v-titre", carte.get("titre", ""), corps, "anton", 400,
                         # §3 — 1,08 is the floor for a display face, and §9 bis's
                         # own closing budget is computed at it: 3 × 80 = 259 px.
                         encre_titre, V_MARGE_X, largeur, interligne=1.08,
                         majuscule=True)
        # §9 bis — « Elle le traverse » is the punch, and both halves stay at the
        # same rank. Relegated to the body it reads as a qualification; set in the
        # accent inside the title it reads as the argument. The boundary is the
        # last sentence break, so a closing written for another lot inherits it.
        if cloture and titre is not None:
            titre.accent_depuis = _chute(carte.get("titre", ""))
        _v_poser(slot, "v-precision", carte.get("precision", ""), V_PRECISION_CORPS,
                 "nunito", 600, encre1, V_MARGE_X, largeur, interligne=1.3)

    # **A fixed-height slot overflows upward.** `justify-content: flex-end` with a
    # child at `min-height: auto`: nothing compresses, and the overflow leaves by
    # the top, into the part where the scrim is still ramping. Measured: eleven
    # characters added to an opening title took it from two composed lines to
    # three — 285 px in a slot of 220 — and its first line landed 65 px above, at
    # alpha 0,43 and 2,63:1.
    # §9 bis — on a closing the dating shares the title slot with the reversal:
    # « titre 80 px sur trois lignes (259 px) + datation deux lignes (96 px) =
    # 375 px » in a slot of 380. The reversal holds in one display sentence with
    # both halves at the same rank — « Elle le traverse » is the punch, and
    # relegated to the body it reads as a qualification.
    if cloture:
        _v_poser(slot, "v-datation", carte.get("corps", ""), V_PRECISION_CORPS,
                 "nunito", 400, encre1, V_MARGE_X, largeur, interligne=1.41)

    _v_empiler(p, slot, haut_slot, h_slot, "titre")

    # ── the bottom slot ──────────────────────────────────────────────────────
    # On a scene it is the narration band, reserved even when the caption is
    # absent. On a **closing** it is 270 px and it is not a caption band at all:
    # it carries the vision on its plate and the pastille under it. A closing that
    # also reserved a caption band would have the line still being spoken land on
    # the same plate and say something else — an address, in the one image that
    # has to carry the argument.
    h_bas = V_BAS_CLOTURE if cloture else V_NARRATION[1]
    p.blocs.append(Bloc("bande-cloture" if cloture else "bande-sous-titre",
                        V_MARGE_X, V_NARRATION[0], largeur, h_bas))

    if cloture:
        bas = []
        # The plate's padding travels with the block while the slot is stacked,
        # and comes off again once it has a floor: what the stacker places is the
        # plate, what the painter draws is the line inside it.
        vision = _v_poser(bas, "v-vision", carte.get("source", ""), V_VISION_CORPS,
                          "nunito", 800, encre1, V_MARGE_X + V_PLAQUE_MARGE[0],
                          largeur - 2 * V_PLAQUE_MARGE[0],
                          interligne=V_VISION_INTERLIGNE)
        if vision is not None:
            # §9 bis — one word or phrase of the plate takes the accent. It lives
            # here and in the title, and nowhere else on a video keyframe: §4 puts
            # the floor at 0,84 and the scrim tops out at 0,72, so the gold only
            # holds where the ground is opaque.
            vision.mot_accent = (carte.get("pivot") or "").strip()
            vision.h += 2 * V_PLAQUE_MARGE[1]

        # §8's pastille, unchanged — « jamais un lien seul » is satisfied by what
        # stands above it, not by making the link into a sentence.
        appel = (carte.get("appel") or APPEL_DEFAUT).upper()
        f = fonte("nunito", V_PASTILLE_CORPS, 800)
        bas.append(Bloc(
            "appel-action", V_MARGE_X, 0,
            round(_mesureur.textlength(appel, font=f) + 2 * V_PASTILLE_PADDING[1]),
            round(V_PASTILLE_CORPS * 1.3 + 2 * V_PASTILLE_PADDING[0]),
            appel, accent, V_PASTILLE_CORPS, "nunito", 800, (appel,), 1.3, "centre"))

        _v_empiler(p, bas, V_NARRATION[0], h_bas, "bas de clôture")

        if vision is not None:
            vision.h -= 2 * V_PLAQUE_MARGE[1]
            vision.y += V_PLAQUE_MARGE[1]
            p.blocs.append(Bloc(
                "plaque-vision", V_MARGE_X, vision.y - V_PLAQUE_MARGE[1],
                largeur, vision.h + 2 * V_PLAQUE_MARGE[1]))

    # ── the foot, pinned to the bottom of the frame ──────────────────────────
    from ethni_brand import filigrane, FILIGRANE_PX
    marque = filigrane(FILIGRANE_PX, _rgb(_encre(deck, 3)), V_FILIGRANE_OPACITE)
    t = dict(_role_type("Crédit", "reel"), corps=V_CREDIT_CORPS)
    lignes_credit = _lignes_credit(carte, deck)
    y = H - V_CREDIT_BAS
    pose = []
    for i, ligne in enumerate(lignes_credit[:2]):
        bloc = _v_poser(pose, f"credit-{i}", ligne, V_CREDIT_CORPS, t["face"],
                        t["graisse"], encre2, V_MARGE_X,
                        largeur - marque.width - 24, interligne=1.45)
        if bloc is not None:
            bloc.opacite = ANNEXE_OPACITE
    haut_credit = sum(b.h for b in pose)
    for bloc in pose:
        bloc.y = y - haut_credit + sum(b.h for b in pose[:pose.index(bloc)])
        p.blocs.append(bloc)
    p.blocs.append(Bloc("filigrane", W - V_MARGE_X - marque.width,
                        y - marque.height, marque.width, marque.height))

    return p


def _chute(titre):
    """The word index at which a closing title's second sentence begins.

    §9 bis's closing is two display sentences — « Une frontière ne contient pas un
    peuple. Elle le traverse. » — and the second is the punch. Returning an index
    rather than the phrase is what lets it survive a line break.
    """
    mots = (titre or "").split()
    for i in range(len(mots) - 1, 0, -1):
        if mots[i - 1].endswith((".", "!", "?")):
            return i
    return -1


def _v_empiler(p, blocs, haut_slot, h_slot, nom_slot):
    """Stack a slot's blocks, bottom-aligned, overflowing upward.

    The slot's floor never moves; what a long block does is push its own top out
    of the slot, upward. `p.fautes` records the overflow so a copy edit is caught
    at the measure and not on screen.
    """
    if not blocs:
        return
    gouttiere = 18
    total = sum(b.h for b in blocs) + gouttiere * (len(blocs) - 1)
    y = haut_slot + h_slot - total          # flex-end: the floor is the anchor
    for bloc in blocs:
        bloc.y = round(y)
        y += bloc.h + gouttiere
        p.blocs.append(bloc)

    # §9 bis's double check, both halves of it.
    if total > h_slot:
        p.fautes.append(
            f"emplacement « {nom_slot} » : {total} px de contenu pour {h_slot} px — "
            f"le bloc déborde de {total - h_slot} px vers le haut, hors voile. "
            f"Raccourcis la copie : toute édition se remesure")



def peindre_video(carte, deck, *, image, sous_titre=False, plan_donne=None,
                  instant=None, duree=None):
    """§9 bis — draw a video keyframe.

    The image is full frame on every keyframe: a band with a flat under it makes a
    hard seam that, in movement, reads as an edit cut.
    """
    p = plan_donne if plan_donne is not None else plan_video(
        carte, deck, image=image, sous_titre=sous_titre)
    if duree:
        cadencer(p, duree)

    W, H = 1080, 1920
    base = _rgb(_fond(deck))
    im = Image.new("RGBA", (W, H), base + (255,))
    im.paste(_couvrir(image.convert("RGB"), W, H,
                      carte.get("image", {}).get("cadrage", "50% 50%")).convert("RGBA"),
             (0, 0))

    # §4's video exception — two scrims, and the gap between them is the image.
    # The plate is composited **before** the label: declared after it, it would
    # paint over it and darken it by its own alpha, which is invisible in review
    # and obvious on screen.
    plaque = p.bloc("voile-plaque")
    if plaque is not None:
        im.alpha_composite(Image.fromarray(
            np.repeat(_rampe(plaque.h, V_PLAQUE_ARRETS, base)[:, None, :], W, axis=1),
            "RGBA"), (0, plaque.y))

    bas = p.bloc("voile-bas")
    if bas is not None:
        arrets = tuple(((y - bas.y) / max(1, bas.h), a)
                       for y, a in _v_arrets_cadres(bas))
        im.alpha_composite(Image.fromarray(
            np.repeat(_rampe(bas.h, arrets, base)[:, None, :], W, axis=1),
            "RGBA"), (0, bas.y))

    # The vision's plate, before its own text and before every other block: a
    # plate declared after what it carries paints over it.
    plaque_vision = p.bloc("plaque-vision")
    if plaque_vision is not None:
        _plaque_fond(im, (plaque_vision.x, plaque_vision.y,
                          plaque_vision.x + plaque_vision.w,
                          plaque_vision.y + plaque_vision.h), deck)

    d = ImageDraw.Draw(im)
    for bloc in p.blocs:
        # The pastille draws its ring and its label together, so the generic pass
        # printing the label too would set it twice, offset.
        if not bloc.texte or bloc.nom == "appel-action":
            continue
        arrive = avancement(bloc, instant)
        if arrive <= 0:
            continue
        f = fonte(bloc.face, bloc.corps, bloc.graisse)
        encre = _teinter(bloc.couleur, _fond(deck), arrive * bloc.opacite)
        vise = _teinter(_accent(deck), _fond(deck), arrive)
        y = bloc.y + round(ENTREE_TRANSLATION * (1 - arrive))
        vus = 0
        for ligne in bloc.lignes:
            x = bloc.x
            for part, couleur in _teintes_de_ligne(ligne, bloc, vus, encre, vise):
                d.text((x, y), part, font=f, fill=couleur)
                x += _mesureur.textlength(part, font=f)
            vus += len(ligne.split())
            y += bloc.corps * bloc.interligne

    _peindre_sous_titre(im, p, deck, sous_titre)
    _peindre_appel(im, p, deck)
    _peindre_filigrane_video(im, p, deck)
    return im.convert("RGB")


def _teintes_de_ligne(ligne, bloc, vus, encre, vise):
    """One line as coloured runs — the accent word, or the accent tail, or neither.

    Drawn in runs rather than as separate blocks so the accented part keeps the
    line's own metrics: a second block would re-measure and drift off the baseline.
    """
    if bloc.accent_depuis >= 0:
        mots = ligne.split(" ")
        coupe = max(0, bloc.accent_depuis - vus)
        avant, apres = " ".join(mots[:coupe]), " ".join(mots[coupe:])
        if avant and apres:
            avant += " "
        return [(t, c) for t, c in ((avant, encre), (apres, vise)) if t]
    if bloc.mot_accent:
        morceaux = _decouper_mot(ligne, bloc.mot_accent)
        if morceaux:
            return [(t, c) for t, c in zip(morceaux, (encre, vise, encre)) if t]
    return [(ligne, encre)]


def _v_arrets_cadres(bas):
    """§9 bis's stops, clipped to the scrim block the plan actually placed."""
    cloture = bas.y != V_VOILE_HAUT
    decalage = bas.y - V_VOILE_HAUT
    return tuple((min(max(y + (decalage if y < 1920 else 0), bas.y), bas.y + bas.h), a)
                 for y, a in V_VOILE_ARRETS)


def _peindre_filigrane_video(im, p, deck):
    """§9 bis — the mark at 0,72, not 0,55.

    Set on a night flat at 0,93 rather than on a photograph, it goes out at the
    carousel's opacity.
    """
    bloc = p.bloc("filigrane")
    if bloc is None:
        return
    from ethni_brand import filigrane, FILIGRANE_PX
    im.alpha_composite(filigrane(FILIGRANE_PX, _rgb(_encre(deck, 3)),
                                 V_FILIGRANE_OPACITE), (bloc.x, bloc.y))


# ------------------------------------------------------------------ drawing


def _couvrir(image, w, h, cadrage="50% 50%"):
    """`object-fit: cover`, honouring the card's focal point."""
    echelle = max(w / image.width, h / image.height)
    taille = (max(1, math.ceil(image.width * echelle)), max(1, math.ceil(image.height * echelle)))
    grande = image.resize(taille, Image.Resampling.LANCZOS)
    fx, fy = (float(v.strip().rstrip("%")) / 100 for v in cadrage.split())
    x = round((grande.width - w) * fx)
    y = round((grande.height - h) * fy)
    return grande.crop((x, y, x + w, y + h))


def _mots(texte):
    """The words of a string, folded — for comparing two spellings of one line."""
    return [m for m in (_plier(x).strip(".,;:!?«»’'…") for x in texte.split()) if m]


def _decouper_mot(ligne, mot):
    """Split a line around a word **or a phrase** — (before, it, after), or None.

    Matched folded, because the title is set in capitals and `titre_camps` is
    written in lower case with its accents: « brésilien » has to find « BRÉSILIEN »
    and stop at the full stop after it.

    §9 accents « un mot ou un membre de phrase », and a single word is a phrase of
    one: « qu'un pays » found nothing while this matched one token at a time, and
    the closing's vision came out flat.
    """
    if not mot:
        return None
    cible = [_plier(x).strip(".,;:!?«»’'") for x in mot.split() if x]
    if not cible:
        return None
    morceaux = ligne.split(" ")
    debut = 0
    for i, morceau in enumerate(morceaux):
        fenetre = [_plier(x).strip(".,;:!?«»’'") for x in morceaux[i:i + len(cible)]]
        if fenetre == cible:
            fin = debut + len(" ".join(morceaux[i:i + len(cible)]))
            return ligne[:debut], ligne[debut:fin], ligne[fin:]
        debut += len(morceau) + 1
    return None


def _rampe(h, arrets, base):
    """A vertical alpha ramp as an (h, 4) array — §4's linear gradients."""
    positions = np.array([a[0] for a in arrets], dtype=float)
    alphas = np.array([a[1] for a in arrets], dtype=float)
    u = np.linspace(0.0, 1.0, max(h, 1))
    a = np.interp(u, positions, alphas)
    colonne = np.zeros((max(h, 1), 4), dtype=np.uint8)
    colonne[:, 0], colonne[:, 1], colonne[:, 2] = base
    colonne[:, 3] = (a * 255).astype(np.uint8)
    return colonne


def _plier(mot):
    """A word without its case or its accents, for matching only."""
    return "".join(c for c in unicodedata.normalize("NFD", mot.lower())
                   if unicodedata.category(c) != "Mn")


def _teinter(couleur, fond, part):
    """A colour part-way toward the ground, standing in for an opacity.

    Mixing toward the ground rather than compositing a translucent layer per
    block: the result is identical over a flat ground and indistinguishable over
    a scrimmed photograph, for one blend instead of an image allocation per block
    per frame.
    """
    if part >= 1:
        return couleur
    c, g = _rgb(couleur), _rgb(fond)
    return "#%02x%02x%02x" % tuple(
        round(g[i] + (c[i] - g[i]) * part) for i in range(3))


def _rgb(hexa):
    hexa = hexa.lstrip("#")
    return tuple(int(hexa[i:i + 2], 16) for i in (0, 2, 4))


def fond_compose(carte, deck, fmt_key, *, image, sous_titre=False):
    """Everything except the text: ground, image, and the three scrim layers.

    Exposed because §11 measures contrast on « les pixels réels sous le voile ».
    Sampling the finished card instead reads the glyphs as part of their own
    ground — a large Anton title fills most of its own box, so the measurement
    drifts toward 1:1 and the check silently stops meaning anything.
    """
    return fond_et_plan(carte, deck, fmt_key, image=image, sous_titre=sous_titre)[0]


def fond_et_plan(carte, deck, fmt_key, *, image, sous_titre=False, disposition=None):
    """The ground, and the plan that produced it — faults included.

    The scrim reinforcement records what it could not fix on the plan it was
    handed. A caller that rebuilds its own plan to read those faults gets a
    different object with an empty list, and silently concludes all is well.
    """
    p = plan(carte, deck, fmt_key, image=image, sous_titre=sous_titre,
             disposition=disposition)
    return _peindre(carte, deck, fmt_key, image=image, sous_titre=sous_titre,
                    texte=False, plan_donne=p), p


def composer(carte, deck, fmt_key, *, image, sous_titre=False, epreuve=None,
             instant=None, duree=None):
    """Draw a plan. `epreuve` is a list of unmet gates; when set, it is stamped."""
    return _peindre(carte, deck, fmt_key, image=image, sous_titre=sous_titre,
                    texte=True, epreuve=epreuve, instant=instant, duree=duree)


def _peindre(carte, deck, fmt_key, *, image, sous_titre, texte, epreuve=None,
             instant=None, duree=None, plan_donne=None):
    p = plan_donne if plan_donne is not None else plan(
        carte, deck, fmt_key, image=image, sous_titre=sous_titre)
    if duree:
        cadencer(p, duree)
    cadre = tk.fmt(fmt_key)
    W, H = cadre["w"], cadre["h"]
    base = _rgb(_fond(deck))

    im = Image.new("RGBA", (W, H), base + (255,))

    bande = p.bloc("bande-image")
    im.paste(_couvrir(image.convert("RGB"), bande.w, bande.h,
                      carte.get("image", {}).get("cadrage", "50% 50%")).convert("RGBA"),
             (bande.x, bande.y))

    def poser(bloc, arrets):
        if bloc is None or bloc.h <= 0:
            return
        im.alpha_composite(
            Image.fromarray(np.repeat(_rampe(bloc.h, arrets, base)[:, None, :],
                                      W, axis=1), "RGBA"), (bloc.x, bloc.y))

    # §4 — **one scrim on a full-frame card.** The ramp, then the column's flat, in
    # that order and touching: the ramp ends at 0,92 exactly where the flat begins,
    # so the composited alpha climbs and never comes back down. Nothing here is a
    # hand-written ordinate — both blocks were placed from the column itself.
    if p.bloc("voile-colonne") is not None:
        poser(p.bloc("voile-rampe"), RAMPE_ARRETS)
        poser(p.bloc("voile-colonne"), COLONNE_ARRETS)
    else:
        # A banded card: the flat under the band carries the text, and the plate
        # over the band carries the banner. No two scrims meet, so none cancel.
        poser(p.bloc("voile-bande"), ((0.0, 0.0), (1.0, 0.92)))

        # §4 — the plate holds its full 0,92 through the header row and only fades
        # below it. Fading from the very top left the banner sitting at 0,42 on a
        # pale engraving, which measures 2,78:1 where the alpha table asks 0,92.
        # The turn is read off the row, never written as a fraction.
        plaque = p.bloc("voile-bandeau")
        if plaque is not None and plaque.h > 0:
            entete = [b for b in p.blocs if b.nom.startswith("entete-")]
            bas = max((b.y + b.h for b in entete), default=0)
            palier = min(0.9, max(0.1, (bas - plaque.y) / plaque.h)) if bas else 0.4
            poser(plaque, ((0.0, 0.92), (palier, 0.92), (1.0, 0.0)))

    # §5A — no plate and no box behind the narration block. A rounded flat over an
    # already-scrimmed photograph darkens twice and reads as a window stuck onto the
    # image; the charter says an aside is a rule, not a box. If the text is not
    # legible without a plate, the scrim is mis-set — or the image does not suit.
    if not texte:
        return im.convert("RGB")

    d = ImageDraw.Draw(im)
    for bloc in p.blocs:
        # The pastille draws its own ring and its own label together, so letting
        # the generic pass draw the label too printed it twice, offset.
        if not bloc.texte or bloc.nom in ("appel-action", "defilement"):
            continue
        arrive = avancement(bloc, instant)
        if arrive <= 0:
            continue        # not yet on screen

        f = fonte(bloc.face, bloc.corps, bloc.graisse)
        # An opacity and a short upward translation. The block settles onto its
        # planned position, so the geometry the tests assert is where it ends up.
        decalage = round(ENTREE_TRANSLATION * (1 - arrive))
        encre = _teinter(bloc.couleur, _fond(deck), arrive * bloc.opacite)
        y = bloc.y + decalage
        vise = _teinter(_accent(deck), _fond(deck), arrive) if bloc.mot_accent else None
        for ligne in bloc.lignes:
            # A wrapped block set flush left inside a centred column reads as a
            # ragged column drifting off its own axis.
            x = bloc.x
            if bloc.aligne == "centre":
                x += (bloc.w - _mesureur.textlength(ligne, font=f)) / 2
            morceaux = _decouper_mot(ligne, bloc.mot_accent) if vise else None
            if morceaux:
                # Drawn in three runs so the word keeps the line's own metrics: a
                # separate block would re-measure and drift off the baseline.
                for part, couleur in zip(morceaux, (encre, vise, encre)):
                    if part:
                        d.text((x, y), part, font=f, fill=couleur)
                        x += _mesureur.textlength(part, font=f)
            else:
                d.text((x, y), ligne, font=f, fill=encre)
            y += bloc.corps * bloc.interligne

    _peindre_sous_titre(im, p, deck, sous_titre)
    _peindre_appel(im, p, deck)
    _peindre_defilement(im, p, deck, cadre["k"])
    _peindre_filigrane(im, p, deck, cadre["k"])

    if epreuve:
        _tamponner_epreuve(im, epreuve, deck, p)
    return im.convert("RGB")


def _tamponner_epreuve(im, manquantes, deck, p):
    """§3 of the engine brief — a diagonal band and the gates in plain language.

    The list says what to do, not what failed: a proof is looked at by whoever
    has to clear it.
    """
    W, H = im.size
    bande = Image.new("RGBA", (W * 2, round(H * 0.10)), (200, 30, 30, 190))
    d = ImageDraw.Draw(bande)
    f = fonte("anton", round(H * 0.045))
    texte = "ÉPREUVE — NE PAS PUBLIER   " * 6
    d.text((0, 0), texte, font=f, fill=tk.color("--afh-night-ink"))
    im.alpha_composite(bande.rotate(-24, expand=True, resample=Image.BICUBIC),
                       (-W // 3, H // 3))

    fp = fonte("nunito", round(H * 0.016), 700)
    lignes = ["Portes non franchies :"]
    for m in manquantes:
        # Wrapped, because a gate that explains what to do is useless truncated at
        # the frame edge — which is what the first proof did.
        enveloppe = _envelopper(f"• {m}", "nunito", round(H * 0.016), 700, W - 64)
        lignes.extend(enveloppe)

    pas = round(H * 0.016 * 1.5)
    encart = Image.new("RGBA", (W, pas * len(lignes) + 32), _rgb(_fond(deck)) + (238,))
    de = ImageDraw.Draw(encart)
    for i, ligne in enumerate(lignes):
        de.text((32, 16 + pas * i), ligne, font=fp,
                fill=tk.color("--afh-night-ink" if i == 0 else "--afh-night-ink-2"))
    # Above the foot, never over it. The credit is what has to be read to clear
    # the gate that produced this proof in the first place.
    pied_haut = min((b.y for b in p.blocs if b.nom.startswith("credit")), default=H)
    im.alpha_composite(encart, (0, max(0, pied_haut - encart.height - 16)))


def _plaque_fond(im, boite, deck, rayon=16):
    """A rounded opaque plate. §9 — the subtitle's, and nothing else's.

    Opaque on purpose. §9 refuses a thick outline on a display face: an outline is
    a patch over contrast, and a plate does the work properly. It is allowed here
    and nowhere else because the subtitle lives in a band the plan reserves for it,
    not on the photograph — §5A forbids a plate on an image.

    It carries no vertical rule. §3: a full-height rule touches the title the
    moment the column grows, and says nothing the gutter has not already said.
    """
    x0, y0, x1, y1 = boite
    couche = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(couche)

    # A plate has to read as a surface. Filled with the ground colour it is
    # invisible on parchment.
    if _theme(deck) == "nuit":
        fond, alpha = _rgb(_fond(deck)), 204
    else:
        fond, alpha = _rgb(tk.color("--afh-color-bg-warm")), 235
    d.rounded_rectangle((x0, y0, x1, y1), rayon, fill=fond + (alpha,))
    im.alpha_composite(couche)


def _peindre_sous_titre(im, p, deck, sous_titre):
    """§9 — the spoken line, on its plate, in the band the plan reserved.

    It follows the audio, so nothing here consults the cadence.
    """
    bande = p.bloc("bande-sous-titre")
    if bande is None or not isinstance(sous_titre, dict):
        return
    lignes = sous_titre.get("lignes") or []
    if not lignes:
        return

    # §9 bis — 52 px in video, not the 44–46 of §3's row: at 44 the caption reads
    # badly on a phone held at arm's length. The video gabarit says so, and the
    # video plan is the one that reserves this band.
    t = _role_type("Sous-titre narration", "reel")
    if p.bloc("voile-plaque") is not None:
        t = dict(t, corps=V_SOUS_TITRE_CORPS, graisse=800)
    f = fonte("nunito", t["corps"], t["graisse"])

    # Re-wrapped here against the band, with the font that will draw it: the
    # caller wraps on a character count, which is a different width in every
    # string and ran the caption off both edges of the frame.
    #
    # And if two lines still will not hold it, the type gives way rather than the
    # copy — narration is approved and is never shortened to fit a frame.
    import ethni_soustitre as st

    corps = t["corps"]
    disponible = bande.w - 64
    while True:
        f = fonte("nunito", corps, t["graisse"])
        mesure = lambda x: _mesureur.textlength(x, font=f)  # noqa: B023
        lignes = st.envelopper(" ".join(lignes), mesure=mesure, largeur_max=disponible)
        if max(mesure(l) for l in lignes) <= disponible or corps <= SOUS_TITRE_PLANCHER:
            break
        corps = round(corps * 0.94)

    if max(_mesureur.textlength(l, font=f) for l in lignes) > disponible:
        p.fautes.append(
            f"le sous-titre « {' '.join(lignes)[:40]}… » ne tient pas en deux lignes "
            f"même à {corps} px — raccourcis la phrase de narration")

    largeur = max(_mesureur.textlength(l, font=f) for l in lignes)
    hauteur = _hauteur(lignes, t["corps"], t["interligne"])

    x0 = bande.x + (bande.w - largeur) / 2
    y0 = bande.y + (bande.h - hauteur) / 2
    _plaque_fond(im, (x0 - 32, y0 - 22, x0 + largeur + 32, y0 + hauteur + 22), deck)

    d = ImageDraw.Draw(im)
    pivot = (sous_titre.get("pivot") or "").strip()
    y = y0
    for ligne in lignes:
        x = bande.x + (bande.w - _mesureur.textlength(ligne, font=f)) / 2
        # One pivot word per scene takes the accent. Drawn piece by piece so a
        # second occurrence cannot quietly take it too.
        if pivot and pivot in ligne:
            avant, _, apres = ligne.partition(pivot)
            for morceau, couleur in ((avant, _encre(deck, 1)),
                                     (pivot, _accent(deck)),
                                     (apres, _encre(deck, 1))):
                if morceau:
                    d.text((x, y), morceau, font=f, fill=couleur)
                    x += _mesureur.textlength(morceau, font=f)
        else:
            d.text((x, y), ligne, font=f, fill=_encre(deck, 1))
        y += t["corps"] * t["interligne"]


def _peindre_defilement(im, p, deck, k):
    """§8 — the label, then three chevrons at rising opacity.

    The gradient gives the direction without animation, so it survives an image
    export. Written at the end of the body, « Fais défiler » was a sentence the
    reader had to finish before learning it was an instruction.
    """
    bloc = p.bloc("defilement")
    if bloc is None:
        return
    d = ImageDraw.Draw(im)
    f = fonte("nunito", bloc.corps, 800)
    d.text((bloc.x, bloc.y + (bloc.h - bloc.corps * 1.3) / 2), bloc.texte,
           font=f, fill=_accent(deck))

    fc = fonte("anton", round(40 * k))
    x = (bloc.x + _mesureur.textlength(bloc.texte, font=f) * (1 + DEFILEMENT_INTERLETTRE)
         + round(16 * k))
    yc = bloc.y + (bloc.h - 40 * k * 1.2) / 2
    for opacite in (0.35, 0.65, 1.0):
        d.text((x, yc), "›", font=fc,
               fill=_teinter(_accent(deck), _fond(deck), opacite))
        x += _mesureur.textlength("›", font=fc) * 1.6


def _peindre_appel(im, p, deck):
    """§8 — the circled pastille, last card only, present to the end.

    The scroll cue is the carousel's own, and a reel is not swiped.
    """
    bloc = p.bloc("appel-action")
    if bloc is None:
        return
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((bloc.x, bloc.y, bloc.x + bloc.w, bloc.y + bloc.h),
                        radius=999, outline=_accent(deck), width=2)
    f = fonte("nunito", bloc.corps, 800)
    d.text((bloc.x + (bloc.w - _mesureur.textlength(bloc.texte, font=f)) / 2,
            bloc.y + (bloc.h - bloc.corps * 1.3) / 2),
           bloc.texte, font=f, fill=_accent(deck))


def _peindre_filigrane(im, p, deck, k):
    """§7 bis — the watermark, under the credit, in every layout.

    `ethni_brand` owns the mark itself — one drawing shared by the card and the
    video frame, because two implementations of one mark are two that drift.
    """
    bloc = p.bloc("filigrane")
    if bloc is None:
        return
    from ethni_brand import filigrane, FILIGRANE_PX

    im.alpha_composite(filigrane(round(FILIGRANE_PX * k), _rgb(_encre(deck, 3))),
                       (bloc.x, bloc.y))


# ------------------------------------------------------------------ contrast


def _luminance(rgb):
    c = [v / 255 for v in rgb[:3]]
    c = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def contraste_mesure(im, bloc):
    """§11 — the ratio under a text block, read off the rendered pixels.

    The ground is sampled from the block's own box rather than assumed, because
    what a text sits on is the scrim's result over a photograph, and nobody can
    estimate that. The text halo is not part of the calculation: §4 is explicit
    that the scrim has to reach the threshold on its own.
    """
    boite = im.convert("RGB").crop(
        (max(0, bloc.x), max(0, bloc.y),
         min(im.width, bloc.x + max(bloc.w, 1)), min(im.height, bloc.y + max(bloc.h, 1))))
    pixels = np.asarray(boite, dtype=np.uint8).reshape(-1, 3)
    if not len(pixels):
        return 21.0

    # The ground is the darker mass under the glyphs, not their own ink: take the
    # median, which the strokes cannot move on a block that is mostly background.
    fond = np.median(pixels, axis=0)
    l_fond = _luminance(tuple(fond))
    l_texte = _luminance(_rgb(bloc.couleur))
    clair, sombre = max(l_fond, l_texte), min(l_fond, l_texte)
    return (clair + 0.05) / (sombre + 0.05)


# Surfaces and scrims are not the text pass's business and are checked elsewhere.
_NON_PEINTS = frozenset({"fond", "bande-image", "voile-bandeau", "voile-rampe",
                         "voile-colonne", "voile-bande", "bande-sous-titre"})


def blocs_non_peints(carte, deck, fmt_key, *, image, sous_titre=False):
    """Planned blocks that left no mark on the finished card.

    Crude on purpose: it does not judge whether a block is *right*, only whether
    the pixels in its box differ from the same box on the ground. A block planned
    and never drawn leaves them identical, and that is the whole failure being
    hunted — the rank without its total, the pastille, the lockup.
    """
    fond, p = fond_et_plan(carte, deck, fmt_key, image=image, sous_titre=sous_titre)
    finie = composer(carte, deck, fmt_key, image=image, sous_titre=sous_titre)

    fantomes = []
    for bloc in p.blocs:
        if bloc.nom in _NON_PEINTS:
            continue
        if not bloc.texte and bloc.nom not in ("filigrane", "appel-action"):
            continue

        boite = (max(0, bloc.x), max(0, bloc.y),
                 min(finie.width, bloc.x + max(bloc.w, 1)),
                 min(finie.height, bloc.y + max(bloc.h, 1)))
        if boite[2] <= boite[0] or boite[3] <= boite[1]:
            fantomes.append(bloc.nom)
            continue

        a = np.asarray(finie.convert("RGB").crop(boite), dtype=np.int16)
        b = np.asarray(fond.convert("RGB").crop(boite), dtype=np.int16)
        # A few pixels differing is antialiasing; a drawn block moves thousands.
        if int(np.abs(a - b).sum()) <= 5000:
            fantomes.append(bloc.nom)
    return fantomes


# ------------------------------------------------------------------ the gates


# Words too common to carry a subject. Kept short on purpose: a long stop list
# starts deciding what a card is about.
_VIDES = frozenset("""
avec dans depuis devant entre pour sous sur vers chez
une des les leur leurs son ses cette cet aux
ancien ancienne anciens grand grande grands petite petit
photographie image vue plan premier fond gauche droite haut
""".split())


def _mots_pleins(texte):
    """Content words of a description, accents folded and plurals trimmed.

    A **set**, deliberately: it is crossed against another description to see
    whether two texts talk about the same document, and word order says nothing
    there. Not to be confused with `_mots`, which keeps the order because a title
    and its forced cut have to be the same sentence, not the same vocabulary.
    """
    plie = unicodedata.normalize("NFKD", (texte or "").lower())
    plie = "".join(c for c in plie if not unicodedata.combining(c))
    bruts = re.findall(r"[a-z]{4,}", plie)
    return {m.rstrip("sx") for m in bruts} - {m.rstrip("sx") for m in _VIDES}


def _atteste(image):
    """Whether somebody signed having compared this credit to this image.

    Both halves are required. A date with no name is a checkbox, and a name with
    no date does not say whether it predates the last time the asset changed.
    """
    signature = image.get("verifie") or {}
    return bool(signature.get("par")) and bool(signature.get("le"))


def signature(image):
    """« par, le » as one printable string, or a plain refusal to claim one."""
    s = image.get("verifie") or {}
    return f"{s['par']} le {s['le']}" if s.get("par") and s.get("le") else "non signée"


def _decrivent_la_meme_chose(identite, credit):
    """Whether two descriptions of one document have anything in common.

    This is a **lexical proxy for a semantic check**, and it is worth saying so.
    It catches the failure the spec names — the credit is right and the asset was
    swapped, so the two descriptions share nothing — and it cannot catch a swap
    between two documents that happen to be described with the same words.

    It also fires when one description says \u00ab hameau \u00bb and the other
    \u00ab village \u00bb. That is a false positive, and the fix is to reword the
    identity: an identity that reaches for a synonym where the credit already has
    a plain word is harder for a person to check too.
    """
    return bool(_mots_pleins(identite) & _mots_pleins(credit))


@dataclass
class Verdict:
    passe: bool
    manquantes: list
    licence_sortie: str = ""
    # Things worth a second look that do not stop a lot. Kept apart from
    # `manquantes` so a remark can never be read as a refusal, nor the reverse.
    remarques: list = field(default_factory=list)


def portes(cartes, deck, identites=None):
    """§7 and §11 — the four gates, as one verdict in the operator's language."""
    manquantes = []
    remarques = []
    identites = identites or {}

    # 1 — every licence named, and the output licence computed from the lot.
    licences = [c.get("image", {}).get("licence", "") for c in cartes]
    sortie = tk.licence_sortie(licences)
    if sortie is None:
        sans = [c["rang"] for c, l in zip(cartes, licences) if not l]
        manquantes.append(
            f"la licence n'est pas nommée sur les cartes {sans or '?'} — ouvre la page "
            f"du dépôt, lis la mention, et reporte-la, ou change d'image")

    for c in cartes:
        im = c.get("image", {})

        # 2 — the credit names the document actually composed.
        identite = (im.get("identite") or "").strip()
        if not identite:
            manquantes.append(
                f"carte {c['rang']} : l'image ne dit pas ce qu'elle montre. \u00c9cris "
                f"`image.identite` en regardant l'image, puis relis le cr\u00e9dit \u00e0 "
                f"c\u00f4t\u00e9 \u2014 sans \u00e7a la porte 2 ne garde rien")
        elif not _atteste(im):
            manquantes.append(
                f"carte {c['rang']} : personne n'a sign\u00e9 la comparaison du "
                f"cr\u00e9dit \u00e0 l'image. Regarde les deux, puis pose "
                f"`image.verifie` \u00e0 {{\"par\": \"<qui>\", \"le\": \"<AAAA-MM-JJ>\"}}")
        elif not _decrivent_la_meme_chose(identite, im.get("credit", "")):
            # A remark, not a refusal: a caption and a description legitimately
            # share no vocabulary, and this fired on twenty correct cards.
            remarques.append(
                f"carte {c['rang']} : \u00ab {im['credit']} \u00bb et \u00ab {identite} \u00bb "
                f"ne partagent aucun mot \u2014 v\u00e9rifie que c'est bien le m\u00eame "
                f"document")

        # §10 — a body or a table, never both. A card carrying the two does not
        # know what it is showing, and the renderer would silently pick one.
        paires = c.get("paires")
        # §10 settled it: a card carrying both a body and a pair is the normal form —
        # the pair shows the equivalence, the body says where it comes from. The
        # mutual exclusion was carried over from the video's `corps_paires`, where
        # the table *replaces* the body because there is no room for both. On a
        # still card there is room, and all 41 pair cards use it.

        if paires and not (PAIRES_MIN <= len(paires) <= PAIRES_MAX):
            manquantes.append(
                f"carte {c['rang']} : {len(paires)} paires, et §10 en veut "
                f"{PAIRES_MIN} à {PAIRES_MAX} — au-delà la démonstration devient un "
                f"tableau, et un tableau ne se lit pas à la vitesse du pouce. "
                f"Coupe la carte en deux")

        # 3 — no internal note in a printed field.
        for champ in ("titre", "precision", "punchline", "corps", "source"):
            valeur = c.get(champ, "")
        if valeur is not None and not isinstance(valeur, str):
            manquantes.append(
                f"carte {c.get('rang')} : `{champ}` porte "
                f"{type(valeur).__name__}, pas du texte — {str(valeur)[:40]}. "
                f"Reste d'un schéma retiré ; relance la migration ou réécris le "
                f"champ dans `structure`")
            continue
        if tk.note_interne(valeur or ""):
                manquantes.append(
                    f"carte {c['rang']} : « {c[champ]} » est une note à l'opérateur dans un "
                    f"champ imprimé — tranche-la, elle ne s'imprime pas")
        for champ in ("credit", "depot", "licence"):
            if tk.note_interne(im.get(champ, "")):
                manquantes.append(
                    f"carte {c['rang']} : « {im[champ]} » est une note interne dans le crédit — "
                    f"nomme le document et sa licence, ou change d'image")

        # §10 — a forced cut carries the *words*, not only the break positions:
        # the engine draws `coupe`'s lines in place of the title. A title rewritten
        # without its cut therefore renders the old one, in silence — which is what
        # three of the ten openings did on the first pass of this very rewrite.
        coupe = c.get("coupe")
        if coupe and _mots(" ".join(coupe)) != _mots(c.get("titre", "")):
            manquantes.append(
                f"carte {c['rang']} : `coupe` dit « {' '.join(coupe)} » et le titre "
                f"dit « {c.get('titre', '')} » — la coupe porte les mots, pas "
                f"seulement les retours, donc c'est elle qui s'imprimerait")

    return Verdict(passe=not manquantes, manquantes=manquantes,
                   licence_sortie=sortie or "", remarques=remarques)


def quota(dispositions, fmt_key=""):
    """§6 — the per-card layout rule, verified once more across the whole lot.

    `dispositions` is a list of (rang, disposition) in deck order.

    A carousel is a carousel of images: the rule that reads well card by card can
    still produce a deck where the photograph has shrunk to a band every time. So
    the lot is measured too, and a lot out of quota goes out as a proof.

    **The motive is editorial, never a composition fault.** Cards pile into C for
    two reasons only — the images are too small for full frame, or the texts are
    too long to sit on one. Both are settled in `structure`; nothing in this file
    can fix either, and a threshold bent here would only hide them.
    """
    total = len(dispositions)
    if not total:
        return []

    compte = {lettre: sum(1 for _, d in dispositions if d == lettre) for lettre in "ABC"}
    ou = f" en {fmt_key}" if fmt_key else ""
    motifs = []

    if compte["A"] / total < tk.QUOTA_A_MIN:
        motifs.append(
            f"quota de disposition{ou} : {compte['A']} carte(s) sur {total} en A, "
            f"et §6 en veut au moins {tk.QUOTA_A_MIN:.0%}. Un carrousel où l'image "
            f"est réduite à une bande carte après carte n'est plus un carrousel "
            f"d'images")

    if compte["C"] / total > tk.QUOTA_C_MAX:
        en_c = ", ".join(f"{rang:02d}" for rang, d in dispositions if d == "C")
        motifs.append(
            f"quota de disposition{ou} : {compte['C']} carte(s) sur {total} en "
            f"cartouche, au-delà de {tk.QUOTA_C_MAX:.0%} — cartes {en_c}. Ce sont "
            f"des images trop petites pour le plein cadre ou des textes trop longs "
            f"pour s'y poser : les deux se traitent dans `structure`")

    if compte["B"] > tk.QUOTA_B_MAX:
        motifs.append(
            f"quota de disposition{ou} : {compte['B']} cartes en B, et §6 en veut "
            f"au plus {tk.QUOTA_B_MAX}. B est réservé au mot qui porte seul")

    return motifs


# ------------------------------------------------------------------ rendering


_NON_MOT = re.compile(r"[^a-z0-9]+")


def rendre(carte, deck, fmt_key, *, image, racine, verdict, sous_titre=False):
    """Render, then file by verdict. Never asks; says where it put it and why.

    §6 of the reset brief: a proof is looked at, even imperfect, because that is
    how it gets decided. What is locked is not the render, it is the 🟢.
    """
    cadre = tk.fmt(fmt_key)
    epreuve = None if verdict.passe else verdict.manquantes
    im = composer(carte, deck, fmt_key, image=image, sous_titre=sous_titre, epreuve=epreuve)

    campagne = _NON_MOT.sub("-", (deck.get("campagne") or "carte").lower()).strip("-")
    nom = f"{campagne}_{carte['rang']:02d}_{fmt_key}_{cadre['w']}x{cadre['h']}"
    dossier = racine / ("_epreuves" if epreuve else "images")
    dossier.mkdir(parents=True, exist_ok=True)

    chemin = dossier / f"{nom}{'-epreuve' if epreuve else ''}.png"
    im.save(chemin)
    return im, chemin
