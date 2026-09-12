"""Turn a migrated deck plus its alignment into a video.

    ./venv/bin/python ethni_montage.py <Sujet> [--controle]

Three things happen here and nothing else: scene durations are read off the
alignment, keyframes are rendered through `ethni_compose`, and ffmpeg assembles
them against the narration audio.

**A scene lasts as long as the narration it carries.** The duration is not a
setting: it is the span between the first word the scene opens on and the last
word before the next scene opens. A number typed into a config drifts from the
recording the first time a sentence is re-read.

`--controle` renders the reduced-motion variant: same durations, every block on
the first frame. It is the version to judge a composition from, because a still
frame is easier to read than a movement.
"""
import hashlib
import json
import math
import pathlib
import subprocess
import sys

from PIL import Image

import ethni_compose as gab
import ethni_soustitre as st
from ethni_paths import productions_root

HARNESS = pathlib.Path(__file__).resolve().parent

PROJETS = productions_root()

FPS = 25
FORMAT = "reel"

# §9 bis — **the sign-off card follows the closing; it never replaces it.**
#
# It was cut entirely once, and rightly: it used to be placed on a clearance
# computed against the caption band, which landed it over the closing and made the
# film end on an address. What was wrong was the order, not the card.
#
# So the cue is no longer a clearance, it is a sentence. The card comes up on the
# **last spoken sentence** — the one that says where to go — and holds for the
# asset's own length, which is what its animation needs. Everything before it is
# the argument, spoken and set, on the closing keyframe.
FIN = HARNESS / "outro-reseaux-sociaux.mp4"
FIN_SHA256 = "e6574c240a2adc"          # prefix; the whole file is checked
FIN_SECONDES = 5.0


# ------------------------------------------------------------------ timing


def _mots_alignes(projet):
    fichier = projet / "work" / "aligned-words.json"
    if not fichier.exists():
        raise SystemExit(
            f"{projet.name} : aucun alignement dans work/aligned-words.json — "
            f"la durée des scènes en dépend et ne se devine pas")
    return json.loads(fichier.read_text(encoding="utf-8"))


def durees(cartes, mots, sous_titres, reperes=None):
    """One duration per scene — the narration's own paragraph boundaries.

    **A paragraph of narration is a scene.** `ethni_audio.py` measures those
    boundaries on the paced audio and writes them to `scene-starts.json` « so the
    renderer never guesses a boundary ». Passing them in is therefore reading a
    measurement; the fallback below is the guess, and it is only for a project
    that has not been through the audio pass.

    What the guess cost: dealing 19 captions over 8 scenes gave the closing five
    of them and put the doctrine card on screen at 44,10 s, when its first spoken
    word lands at 50,88 s. Six seconds of argument over a story still running.
    """
    if not cartes:
        return []

    fin_totale = mots[-1]["end"] if mots else 0.0

    if reperes and len(reperes) == len(cartes):
        bornes = list(reperes) + [max(fin_totale, reperes[-1])]
        return [round(bornes[i + 1] - bornes[i], 3) for i in range(len(cartes))]

    par_scene = max(1, len(sous_titres) // len(cartes))
    spans = []
    for i, _ in enumerate(cartes):
        tranche = sous_titres[i * par_scene:(i + 1) * par_scene]
        if i == len(cartes) - 1:
            tranche = sous_titres[i * par_scene:]        # the last takes the rest
        spans.append(tranche)

    moyenne = fin_totale / len(cartes) if cartes else 3.0

    out = []
    for tranche in spans:
        if tranche:
            out.append(round(tranche[-1]["fin"] - tranche[0]["debut"], 3))
        else:
            out.append(round(moyenne, 3))
    return out


def alignement_a_jour(projet, narration):
    """Refuse an alignment that does not describe this script.

    `ethni_audio.py` holds every script token to an aligned word, so the two
    counts match the moment it finishes — and only then. A montage started while
    it is still writing reads the previous variant's alignment and renders scene
    durations from one version with the captions of another, silently.
    """
    fichier = projet / "work" / "aligned-words.json"
    if not fichier.exists():
        return "aucun work/aligned-words.json — lance d'abord ethni_audio.py"
    alignes = json.loads(fichier.read_text(encoding="utf-8"))

    # Les lettres seules : compter les mots supposerait de redécouper le script
    # exactement comme la passe audio, et les deux découpages divergent — un
    # deux-points isolé n'a pas de mot aligné.
    lettres = lambda x: "".join(c for c in x.lower() if c.isalnum())  # noqa: E731
    dit = lettres("".join(w.get("word", "") for w in alignes))
    ecrit = lettres(narration)
    if dit == ecrit:
        return None

    commun = next((i for i, (a, b) in enumerate(zip(dit, ecrit)) if a != b),
                  min(len(dit), len(ecrit)))
    return (f"l'alignement ne décrit pas ce script — il diverge au signe {commun} "
            f"(« …{ecrit[max(0, commun - 30):commun + 10]} »). La passe audio n'a "
            f"pas été relancée depuis la dernière édition, ou elle écrit encore. "
            f"Relance ethni_audio.py et attends qu'elle rende la main.")


def reperes_de_scene(projet, cartes):
    """The measured paragraph starts, when the audio pass has produced them.

    A count that disagrees with the deck is not used: a deck edited after the
    audio pass would silently shift every scene, which is worse than the guess it
    replaces. It is reported instead.
    """
    fichier = projet / "work" / "scene-starts.json"
    if not fichier.exists():
        return None, "aucun scene-starts.json — les scènes sont devinées sur les légendes"
    reperes = json.loads(fichier.read_text(encoding="utf-8"))
    if len(reperes) != len(cartes):
        return None, (f"{len(reperes)} paragraphes de narration pour {len(cartes)} cartes — "
                      f"les scènes sont devinées ; relance la passe audio après une "
                      f"édition du deck")
    return reperes, None


def sous_titre_a(sous_titres, instant, pivot):
    """The caption on screen at this instant. It follows the audio, not the clock."""
    for s in sous_titres:
        if s["debut"] <= instant <= s["fin"]:
            return {"lignes": st.envelopper(s["texte"]), "pivot": pivot}
    return None


# ------------------------------------------------------------------ rendering


# Words too common to carry a subject. Without them « les noms » matches almost
# any closing and the check passes on montages that end on an address.
_OUTILS = {"le", "la", "les", "un", "une", "des", "de", "du", "et", "en", "a",
           "sur", "pas", "ne", "que", "qui", "il", "elle", "ce", "cette", "son",
           "sa", "ses", "plus", "aussi", "sont", "est", "ont", "on", "vous"}


def doctrine_en_dernier_paragraphe(narration, cloture):
    """Whether the closing paragraph says the doctrine, or only an address.

    The **paragraph**, not the last sentence: the last sentence is the sign-off
    that calls the end card, and it is supposed to be an address. What must not be
    an address is everything above it.

    Matched on the closing card's own words rather than on a fixed phrase, so a
    lot that writes its own reversal is judged against the reversal it wrote.
    """
    blocs = [b.strip() for b in narration.split("\n\n") if b.strip()]
    if not blocs or not cloture:
        return True
    dite = {m for m in gab._mots(blocs[-1]) if m not in _OUTILS and len(m) > 2}
    ecrite = {m for m in gab._mots(f"{cloture.get('titre', '')} {cloture.get('source', '')}")
              if m not in _OUTILS and len(m) > 2}
    return len(dite & ecrite) >= 2


def fin_debut(sous_titres, cloture=None):
    """When the sign-off card cuts in: the instant the doctrine has been said.

    The cue is the end of the **closing card's own vision line**, found in the
    narration by its words. Everything after it is the sign-off, so that is where
    the card belongs — it signs, it does not argue.

    Cueing on the last caption instead put it on « Et bientôt, celle des lieux »,
    a breath group and not a sentence: the card came up *after* the sign-off it
    was supposed to carry. `sous_titres[-1]` is the fallback all the same, for a
    lot whose vision the voice never speaks.
    """
    if not sous_titres:
        return None

    debut = float(sous_titres[-1].get("debut", 0.0))
    vision = gab._mots((cloture or {}).get("source", "") or "")
    if vision:
        for st_ in sous_titres:
            dits = gab._mots(st_.get("texte", ""))
            # The vision is one caption or the tail of one; three shared words in
            # order is enough to recognise it and not enough to match a neighbour.
            if len(dits) >= 3 and dits[-3:] == vision[-3:]:
                debut = float(st_.get("fin", debut))
                break

    return round(debut * FPS) / FPS if debut > 0 else None


def _images_fin(dossier, premier, combien):
    """Decode the sign-off card straight into the numbered sequence.

    The asset is the approved one or nothing is written: two files were once both
    called `outro.mp4` and every project copied the wrong one by default.

    **It plays once and then holds its last frame.** Looped, the logo animation
    restarts mid-sign-off and the restart is visible; a signature settles.

    Nothing is painted over it. It cuts in after the closing has said its piece,
    so there is no caption left to carry and no doctrine left to add.
    """
    digest = hashlib.sha256(FIN.read_bytes()).hexdigest()
    if not digest.startswith(FIN_SHA256):
        raise SystemExit(f"la carte de fin n'est pas l'actif approuvé : {digest[:14]}")

    W, H = 1080, 1920
    tuyau = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", str(FIN), "-an",
         "-vf", f"scale={W}:{H},setsar=1", "-frames:v", str(combien),
         "-pix_fmt", "rgb24", "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    derniere = None
    try:
        for i in range(combien):
            brut = tuyau.stdout.read(W * H * 3)
            if len(brut) == W * H * 3:
                derniere = Image.frombytes("RGB", (W, H), brut)
            elif derniere is None:
                raise SystemExit(f"carte de fin : image {i} incomplète")
            derniere.save(dossier / f"{premier + i:06d}.png")
    finally:
        tuyau.stdout.close()
        tuyau.wait()


def rendre_images(projet, deck, sous_titres, duree_par_scene, dossier, controle,
                  plafond_secondes=None, manquantes=None):
    """Every keyframe of every scene, numbered so ffmpeg can read them in order.

    `manquantes` stamps the proof band on every frame. A proof used to be marked
    by its filename alone, which put it one careless double-click away from being
    published — and in a project that also holds an old-gabarit `work/final.mp4`,
    the filename is exactly what nobody checks.
    """
    dossier.mkdir(parents=True, exist_ok=True)
    for f in dossier.glob("*.png"):
        f.unlink()

    debut_scene = 0.0
    n = 0
    # The sign-off card takes the frame from the instant it cuts in. It does not
    # sit over the composition; the closing has finished by then.
    plafond = round(plafond_secondes * FPS) if plafond_secondes else None
    for carte, duree in zip(deck["cartes"], duree_par_scene):
        if plafond is not None and n >= plafond:
            break
        image = Image.open(projet / "assets" / carte["image"]["fichier"]).convert("RGB")
        images = max(1, round(duree * FPS))
        if plafond is not None:
            images = min(images, plafond - n)

        for i in range(images):
            instant = i / FPS
            st_ = sous_titre_a(sous_titres, debut_scene + instant, carte.get("pivot"))
            # §9 bis — the video gabarit, not the carousel one. A video is not a
            # carousel that moves: ported as it stood, the carousel gabarit
            # produced nine recorded defects on this very montage.
            im = gab.peindre_video(
                carte, deck, image=image, sous_titre=st_,
                # The control renders with the clock switched off, not with a
                # different composition: same durations, everything present.
                instant=None if controle else instant,
                duree=None if controle else duree,
                # Scoped to the card on screen: the whole lot's gates on every
                # frame repeat one sentence per card and hide the composition.
                epreuve=(None if manquantes is None
                         else gab.portes_de_la_carte(manquantes, carte)))
            im.save(dossier / f"{n:06d}.png")
            n += 1
        debut_scene += duree
    return n


def assembler(dossier, audio, sortie, images):
    """ffmpeg, from a numbered image sequence and the narration."""
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-framerate", str(FPS),
        "-i", str(dossier / "%06d.png"),
    ]
    if audio.exists():
        # `apad` and not `-shortest`: the scenes decide the length of the film, and
        # a narration that runs a few frames short pads with silence rather than
        # truncating the closing. With `-shortest` the last frames were dropped.
        cmd += ["-i", str(audio), "-c:a", "aac", "-b:a", "192k",
                "-af", "apad", "-frames:v", str(images)]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", str(sortie)]
    subprocess.run(cmd, check=True)
    return sortie


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage : ethni_montage.py <Sujet> [--controle]")
    controle = "--controle" in sys.argv
    projet = PROJETS / sys.argv[1]

    cartes = projet / "cartes.json"
    if not cartes.exists():
        raise SystemExit(
            f"{projet.name} : pas de cartes.json. Lance "
            f"`node social/tools/migrate-scenes/migrate-scenes.mjs {projet.name}`")

    deck = json.loads(cartes.read_text(encoding="utf-8"))
    mots = _mots_alignes(projet)
    narration = (projet / "narration.fr.txt").read_text(encoding="utf-8")
    sous_titres = st.minuter(st.segmenter(narration), mots)

    # Blocking, not a remark: everything downstream is timed off this file, so a
    # stale one does not degrade the montage, it invents it.
    desaccord = alignement_a_jour(projet, narration)
    if desaccord:
        raise SystemExit(f"{projet.name} : {desaccord}")

    reperes, ecart = reperes_de_scene(projet, deck["cartes"])
    duree_par_scene = durees(deck["cartes"], mots, sous_titres, reperes)
    total = sum(duree_par_scene)

    # §9 bis — the sign-off card, cued on the last spoken sentence and held for
    # the length its animation needs.
    debut_fin = fin_debut(sous_titres, deck["cartes"][-1])
    fin_totale = max(total, (debut_fin or 0) + FIN_SECONDES)

    verdict = gab.portes(deck["cartes"], deck)
    deck["licence_sortie"] = verdict.licence_sortie

    suffixe = "-controle" if controle else ""
    # A lot that fails a gate is still rendered — it just never lands where a
    # finished montage lands.
    racine = projet / ("_epreuves" if not verdict.passe else "video")
    racine.mkdir(parents=True, exist_ok=True)
    sortie = racine / f"{deck['campagne']}{suffixe}{'-epreuve' if not verdict.passe else ''}.mp4"

    print(f"{len(deck['cartes'])} scènes · {total:.1f}s de scènes · "
          f"{fin_totale:.1f}s au total · {len(sous_titres)} sous-titres", flush=True)
    if debut_fin:
        # La tolérance est une image, pas un centième : le repère est arrondi à la
        # grille, donc la phrase qui commence pile dessus commence « avant » lui.
        dite = next((x.get("texte", "") for x in sous_titres
                     if float(x.get("fin", 0)) > debut_fin + 1 / FPS), "")
        print(f"  carte de fin à {debut_fin:.2f}s, sur « {dite[:52]} »", flush=True)
    else:
        print("  aucune carte de fin : pas de phrase pour l'appeler", flush=True)
    for i, d in enumerate(duree_par_scene, 1):
        print(f"  scène {i:02d} : {d:5.2f}s", flush=True)

    if ecart:
        verdict.remarques.append(ecart)

    if not doctrine_en_dernier_paragraphe(narration, deck["cartes"][-1]):
        verdict.remarques.append(
            "le dernier paragraphe de narration est une adresse, pas la doctrine — "
            "§9 bis : la voix finit où l'image finit, sur le renversement et la "
            "vision. Correctif structure, pas moteur.")

    if deck["cartes"][-1].get("role") == "bascule":
        # The closing sets its vision and reserves no caption band, so what is said
        # over it is heard and not read. Its **own** paragraph belongs there and
        # says the same thing as the card. What does not belong is an earlier
        # paragraph spilling onto it — the story still running under the argument.
        debut_cloture = sum(duree_par_scene[:-1])
        deborde = [x for x in sous_titres
                   if float(x.get("debut", 0)) < debut_cloture - 1 / FPS
                   and float(x.get("fin", 0)) > debut_cloture]
        if deborde:
            verdict.remarques.append(
                f"{len(deborde)} phrase(s) d'une scène antérieure débordent sur la "
                f"clôture, qui ne porte pas de bande de légende — à partir de "
                f"« {deborde[0].get('texte', '')[:44]}… ». Correctif structure.")

    dossier = projet / "work" / f"images{suffixe}"
    images = rendre_images(projet, deck, sous_titres, duree_par_scene,
                           dossier, controle, plafond_secondes=debut_fin,
                           manquantes=None if verdict.passe else verdict.manquantes)
    if debut_fin:
        _images_fin(dossier, images, round(fin_totale * FPS) - images)
        images = round(fin_totale * FPS)
    print(f"\n{images} images clés rendues", flush=True)

    assembler(projet / "work" / f"images{suffixe}", projet / "work" / "narration.wav",
              sortie, images)
    print(f"montage : {sortie}", flush=True)

    if not verdict.passe:
        print(f"\nÉPREUVE — {len(verdict.manquantes)} porte(s) non franchie(s) :")
        for m in verdict.manquantes:
            print("  • " + m)
    if verdict.remarques:
        print(f"\n{len(verdict.remarques)} remarque(s) :")
        for r in verdict.remarques:
            print("  ~ " + r)


if __name__ == "__main__":
    main()
