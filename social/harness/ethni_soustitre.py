"""Cut a narration into subtitles on breath groups, then hang the times on them.

The order matters and it is the whole fix. The retired pipeline cut the *aligned
words* every three words and produced « Congo portaient le » — a caption that
breaks a noun off its verb because a counter reached three. Segmentation is a
property of the sentence, so it is computed on the narration text, before
alignment, and the aligner is then only asked when each piece is spoken.

§9 in full:

- two lines maximum, cut on sense groups;
- Nunito Sans on an opaque plate, never a thick outline on a display face — an
  outline is a patch over contrast, and the plate does the work properly;
- the band lives in the plan between the content column and the foot;
- one pivot word per scene may take the accent. One.
"""
import re
import unicodedata

# Where French prose lets a caption break without tearing anything.
#
# Punctuation first, because a comma or a full stop is a breath the speaker
# actually takes. Then the function words that open a group: a caption may start
# with « parce que » or « et », never end on them.
PONCTUATION = re.compile(r"(?<=[.!?…:;,])\s+")

# A group opens on these; cutting *before* them is safe, cutting after is not.
OUVREURS = frozenset("""
et ou mais donc or ni car parce puisque comme quand lorsque si que qui
dans sur sous vers chez pour avec sans depuis pendant avant apres
le la les un une des du de au aux ce cette ces son sa ses leur leurs
""".split())

# Never leave one of these dangling at the end of a caption: they point forward,
# and a line that ends on them leaves the viewer mid-thought.
JAMAIS_EN_FIN = OUVREURS | frozenset("""
est sont etait etaient a ont avait avaient
mon ton notre votre nos vos mes tes
""".split())

# §9 — two lines, and a line that fits the column at the subtitle size.
LIGNES_MAX = 2
SIGNES_PAR_LIGNE = 42


# Sentence-final punctuation. A caption ending on one is a complete thought,
# whatever its last word happens to be.
FIN_DE_PHRASE = ".!?…"


def _plie(mot):
    """Lower-cased, stripped, accents removed — for matching a spoken word.

    Used to find a pivot, where « Congo » and « congo, » are the same word.
    **Not** used for the function-word lookup: see `_nu`.
    """
    sans = unicodedata.normalize("NFKD", mot.lower())
    return "".join(c for c in sans if not unicodedata.combining(c)).strip(".,;:!?…«»\"'")


def _nu(mot):
    """Lower-cased and stripped, accents **kept**.

    French function words carry no accent, so folding gains nothing here and costs
    a collision: « là » folds onto « la », and « à ce moment là » was refused for
    ending on an article.
    """
    return mot.lower().strip(".,;:!?…«»\"'")


def _peut_finir(mot):
    if mot and mot[-1] in FIN_DE_PHRASE:
        return True
    return _nu(mot) not in JAMAIS_EN_FIN


def segmenter(texte, signes_max=SIGNES_PAR_LIGNE * LIGNES_MAX):
    """Cut a narration into captions, each at most two lines' worth of text.

    Punctuation is honoured first: it marks a breath the speaker takes, so a cut
    there costs nothing. Only where a sentence runs longer than a caption can
    hold does the function look for a seam, and it looks for the *latest* one that
    fits rather than the first — a caption that stops early wastes the line and
    doubles the number of cuts.
    """
    captions = []
    for phrase in PONCTUATION.split(texte.strip()):
        phrase = phrase.strip()
        if not phrase:
            continue
        if len(phrase) <= signes_max:
            captions.append(phrase)
            continue

        mots = phrase.split()
        courante = []
        for mot in mots:
            essai = courante + [mot]
            if len(" ".join(essai)) <= signes_max:
                courante = essai
                continue

            # Full: back off to the last word that may end a caption.
            coupe = len(courante)
            while coupe > 1 and not _peut_finir(courante[coupe - 1]):
                coupe -= 1
            if coupe <= 1:
                coupe = len(courante)      # no seam: take the whole thing rather
                                           # than emit a one-word caption
            captions.append(" ".join(courante[:coupe]))
            courante = courante[coupe:] + [mot]
        if courante:
            captions.append(" ".join(courante))
    return _refondre(captions, signes_max)


def _refondre(captions, signes_max):
    """Merge neighbours that a comma split into fragments too short to read.

    « Un roi, » / « Léopold II, » / « pour Léopoldville. » is three captions of two
    words each. The speaker does pause on those commas, so the cut is honest — but
    on screen it is three flashes where one line would do, and a caption that
    leaves before it is read is worse than one that holds a beat too long.

    A merge never crosses a full stop: sentence boundaries are the one seam that
    always survives, because they are where the argument turns.
    """
    fondues = []
    for caption in captions:
        if not fondues:
            fondues.append(caption)
            continue

        precedent = fondues[-1]
        ferme = precedent.rstrip()[-1:] in FIN_DE_PHRASE
        ensemble = f"{precedent} {caption}"
        if not ferme and len(ensemble) <= signes_max:
            fondues[-1] = ensemble
        else:
            fondues.append(caption)
    return fondues


def envelopper(caption, signes_par_ligne=SIGNES_PAR_LIGNE, mesure=None, largeur_max=None):
    """Break one caption into at most two lines, balanced.

    Balanced rather than greedy: a greedy wrap fills the first line and leaves a
    stub on the second, which reads as an accident.

    `mesure` is the function that will actually draw the text, and `largeur_max`
    the box it has to fit. Given them, the wrap is decided in pixels. Without
    them it falls back to a character count — which is fine for deciding how much
    a caption may hold before a font is chosen, and wrong for anything that
    draws: fifty-one characters of Nunito 800 at 46 px is 1 100 px, and the band
    is 898.
    """
    mots = caption.split()

    def trop_large(texte):
        if mesure and largeur_max:
            return mesure(texte) > largeur_max
        return len(texte) > signes_par_ligne

    if not trop_large(" ".join(mots)):
        return [caption]

    taille = mesure if (mesure and largeur_max) else len
    plafond = largeur_max if (mesure and largeur_max) else signes_par_ligne * 1.4

    milieu = taille(" ".join(mots)) / 2
    meilleur, cout_min = 1, None
    for i in range(1, len(mots)):
        if taille(" ".join(mots[i:])) > plafond:
            continue
        cout = abs(taille(" ".join(mots[:i])) - milieu)

        # A break between two capitalised words splits a name: « Albert / premier »,
        # « Léopold / II ». It is the same fault as the one this module exists to
        # fix, one scale down, so it is priced rather than forbidden — a caption
        # that cannot break anywhere else still has to break somewhere.
        precedent, suivant = mots[i - 1], mots[i]
        if precedent[:1].isupper() and (suivant[:1].isupper() or suivant[:1].isdigit()):
            cout += plafond

        # A break just before a word that opens a group reads naturally.
        if _nu(suivant) in OUVREURS:
            cout -= plafond * 0.15

        if cout_min is None or cout < cout_min:
            meilleur, cout_min = i, cout
    return [" ".join(mots[:meilleur]), " ".join(mots[meilleur:])]


def minuter(captions, mots_alignes):
    """Hang the aligner's times on captions that were already cut.

    The aligner is asked *when*, never *where*. Matching is by word order rather
    than by string equality: the aligner writes « Libreville, » with its comma and
    the narration may not, and a mismatch there would silently drop a caption.
    """
    minutees = []
    curseur = 0
    for caption in captions:
        n = len(caption.split())
        tranche = mots_alignes[curseur:curseur + n]
        if not tranche:
            break
        minutees.append({
            "texte": caption,
            "debut": tranche[0]["start"],
            "fin": tranche[-1]["end"],
        })
        curseur += n
    return minutees


def pivot(caption, mot):
    """Split a caption around its one accent word, for the plate to colour.

    Returns three pieces — before, the pivot, after — so the renderer never has
    to search the string again and cannot accidentally colour a second one.
    """
    if not mot:
        return caption, "", ""
    cible = _plie(mot)
    mots = caption.split()
    for i, m in enumerate(mots):
        if _plie(m) == cible:
            return " ".join(mots[:i]), mots[i], " ".join(mots[i + 1:])
    return caption, "", ""
