"""The retired gabarit's composer — slots, one composition per role.

Superseded by `ethni_compose.py`, which implements the three layouts of
GABARITS-SOCIAL.md §5 and which `ethni_montage.py` renders new video through. Kept
under a version in its name only because `ethni_render.py` still re-renders
montages cut on the retired gabarit; the carousel script that also imported it
has been deleted.

Nothing new should import this. When the last old-gabarit montage no longer needs
re-rendering, this file and `ethni_render.py` go together.
"""
"""How a block of slots is stacked, for the card and for the video frame alike.

`ethni_type.py` says what one piece of text is. `ethni_plaque.py` draws the figure.
This module says **in what order they appear and how tightly they sit**. It was
imported by the retired carousel script and by `ethni_render.py` so that the first
frame of a video and the cover of its carousel were the same composition rather
than two things that resemble each other.

That was the operator's finding on the first witness, and it is the reason this
module exists: *« La première frame de la vidéo doit ressembler à une image de
carrousel. On doit, dès la première image, avoir toutes les informations, alors que
là, il faut attendre la deuxième frame pour comprendre de quoi on parle. »*

## The opening block

    série     LE VRAI NOM              — there is a series, and this belongs to it
    nom       KROU                     — the subject, in gold, the only gold
    lieu      CÔTE D'IVOIRE            — where that is on today's map
    question  Ça vient de l'anglais crew ?   — the astonishment
    corps     one plain sentence       — for a reader who is not a scholar

Four of those five answer a question a stranger scrolling past actually has, in
the order they have them. The place matters more than it looks: people think in
countries, not in peoples, and a name with no country is a name with no handle.

## Packed from the top, never distributed

A block sits at the top of its band and the slots follow each other at one gap.
It is never spread to fill the band. *« Le titre de la série ou de la vidéo ne va
pas avoir un espacement énorme avec le reste du contenu. »* Distributing put three
hundred pixels of nothing between the series line and the name, and that void is
what read as chaotic — not the type itself.
"""
import re

import ethni_plaque as plaque_figure
import ethni_type as typo

# Between two slots of the same block, at REF_W.
SLOT_GAP = 48

SLOTS = {
    # The opening. Used by a carousel cover and by a video's first scene.
    "couverture": ["serie", "nom", "lieu", "question", "corps"],
    # One point, made once, with its figure and its own source. The figure is a
    # plaque or a counter, and a card carries one of the two: the retired carousel
    # script's `check` always required it, and `ethni_type.ROLES["chiffre"]` has always drawn it
    # with its `legende` beneath. Only this list was missing, so a counter card
    # passed every check and rendered without its figure — silently, because a
    # missing slot is skipped rather than refused. Carousel 4 is the one deck whose
    # figures are all counters, which is why nothing caught it earlier.
    "entree":     ["serie", "chiffre", "plaque", "titre", "corps", "source"],
    # The conclusion and the address.
    "cloture":    ["serie", "titre", "corps"],
}

REQUIRED = {
    "couverture": ["nom", "question"],
    "entree":     ["titre", "corps"],
    "cloture":    ["titre"],
}


def blocks(card, role, width, maxw_frac):
    """(height, drawer) for every filled slot, in reading order."""
    out = []
    for slot in SLOTS[role]:
        if not card.get(slot):
            continue
        if slot == "plaque":
            spec = card["plaque"]
            out.append((plaque_figure.measure(spec, width, maxw_frac),
                        lambda im, top, spec=spec: plaque_figure.draw(
                            im, spec, top, None, width, maxw_frac)))
        else:
            piece = dict(card, role=slot, text=card[slot])
            out.append((typo.measure(piece, width, maxw_frac),
                        lambda im, top, piece=piece: typo.draw(
                            im, piece, top, width, maxw_frac)))
    return out


def height(card, role, width, maxw_frac):
    made = blocks(card, role, width, maxw_frac)
    gap = round(SLOT_GAP * width / typo.REF_W)
    return sum(h for h, _ in made) + gap * max(0, len(made) - 1)


def draw(im, card, role, top, width, maxw_frac):
    """Stack the block from `top` downward. Returns the ink box actually drawn."""
    made = blocks(card, role, width, maxw_frac)
    gap = round(SLOT_GAP * width / typo.REF_W)
    box, y = None, top
    for h, drawer in made:
        here = drawer(im, y)
        if here:
            box = here if box is None else (
                min(box[0], here[0]), min(box[1], here[1]),
                max(box[2], here[2]), max(box[3], here[3]))
        y += h + gap
    return box


SHARE_ALIKE = re.compile(r"CC BY-SA", re.I)


def derived_licence(credit_lines):
    """The licence a finished piece inherits from its visuals, or None.

    A piece built on photographs is a derivative work and takes on their
    obligations, not only their credits. Where any source is share-alike the whole
    piece goes out share-alike, and it has to say so.

    Mixed versions resolve upwards: 2.0 and 3.0 both carry the « later version with
    the same licence elements » clause, so a 2.0 plus 4.0 mix releases at 4.0
    rather than hiding the mix. This is the one licensing judgement in the harness.
    It lives here, next to the composition both engines share, because it lived in
    the carousel alone for a day and seven finished videos went out without the
    line their sources required.
    """
    return "CC BY-SA 4.0" if SHARE_ALIKE.search(" ".join(credit_lines)) else None


def accent_spend(card, role):
    """How many gold elements the block would carry. One is the ceiling."""
    return typo.accent_spend(
        [{"role": s} for s in SLOTS[role] if card.get(s) and s != "plaque"],
        has_plaque=bool(card.get("plaque")))


def check_card(card, role, rank):
    """The editorial contract of one block, before a pixel exists."""
    assert role in SLOTS, f"carte {rank} : rôle {role!r} inconnu"
    for field in REQUIRED[role]:
        assert card.get(field), f"carte {rank} ({role}) : « {field} » est obligatoire"
    spend = accent_spend(card, role)
    assert spend <= 1, (
        f"carte {rank} : {spend} éléments en or. L'or marque le nom que la carte "
        f"examine, une fois. Tout le reste est blanc")


def solve_scale(need, band, ceiling=1.00, headroom=0.96, floor=0.36):
    """Largest scale at which `need(scale)` fits `band` pixels of height.

    The copy is validated word for word and is never shortened to fit a frame, so
    the frame fits the text. `need` is a callable that returns the height the
    caller requires at a given scale, and raises `AssertionError` when a line does
    not fit its width — which is a scale that is simply too large.

    The caller owns its geometry and this owns the search, because there are two
    of them: a carousel solves one scale per deck and per format, a video one
    scale for all its scenes. Six cards at six sizes, or four scenes at four, is
    the incoherence this grammar exists to remove.
    """
    lo, hi = 0.35, ceiling
    for _ in range(26):
        mid = (lo + hi) / 2
        try:
            required = need(mid)
        except AssertionError:
            hi = mid
            continue
        if required <= band * headroom:
            lo = mid
        else:
            hi = mid
    assert lo > floor, (
        "aucune échelle ne fait tenir ce lot dans sa bande : une carte porte trop "
        "de texte pour le format, et c'est le texte qu'il faut revoir en amont")
    return lo
