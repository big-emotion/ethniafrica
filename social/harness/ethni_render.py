"""Assemble a clean master from a declarative scene sheet, then burn the gold captions.

Generic form of the renderer written for « Corriger la carte ». The engine, the
brand ending and every measured constraint are frozen here; a project supplies
only `scenes.json` and its `assets/`.

    python3 ethni_render.py <project-dir>

Scene boundaries come from `work/scene-starts.json`, derived from the FINAL paced
narration — never from an estimate. The last scene is the brand ending, and the
spoken call to action plays over it.

## scenes.json

    {
      "background": "#142B25",
      "scenes": [
        {
          "bg": {"kind": "photo",  "asset": "hall.jpg", "zoom": 0.035},
          "bg": {"kind": "colour"},
          "bg": {"kind": "plate",  "asset": "map.jpg", "width": 1010,
                 "centreY": 890, "keepTop": 0.80},

          "cards": [
            {"role": "serie",    "text": "Le vrai nom · série",         "at": "haut"},
            {"role": "nom",      "text": "Sénégal",                   "at": "haut"},
            {"role": "mot",      "text": "Sunu gaal", "at": "bas",
             "sens": "« notre pirogue » · wolof",
             "cue":  {"word": "notre", "nth": 2, "offset": -1.20}}
          ],

          "plaque": {"at": "centre",
                     "accent":  "second",
                     "premier": {"text": "Hottentot",
                                 "gloss": "forgé par les colons néerlandais du Cap"},
                     "second":  {"text": "Khoekhoe",
                                 "gloss": "« les hommes des hommes »"},
                     "cue":     {"word": "Khoekhoe"}},

          "items":  [{"text": "CORRIGER", "y": 420, "size": 162,
                      "face": "anton", "colour": "gold", "delay": 0}],
          "note":   {"lines": ["* …", "Source · 2026"], "top": 200},
          "credit": ["Légende du visuel", "Auteur · Commons · CC BY-SA 4.0"]
        }
      ]
    }

`premier` is the imposed name, `second` the name the people gives itself, and
`accent` names which of the two is gold — declared, never guessed. The roles are
those of `ethni_type.py`, and there is no `registre`: the pillar line is `serie`.
This docstring said otherwise until 2026-09-09, and it is the schema the thirteen
video sessions read.

There must be exactly one scene per narration paragraph. `note` is the on-screen
source annotation; `credit` is the licence line, and a photographic scene without
one fails — a visual whose licence is not stated does not go out.

### `ouverture` — the first frame is a cover, and it is complete

    "ouverture": {"serie":    "Le vrai nom · série",
                  "nom":      "Krou",
                  "lieu":     "Côte d'Ivoire · Liberia",
                  "question": "Ce nom viendrait de l'anglais « crew » ?",
                  "corps":    "Des marins krou montaient sur les navires européens."}

The same block `ethni_carousel.py` draws as a cover, drawn by the same module
(`ethni_compose.py`), because a viewer meets this channel mid-scroll and knows
nothing. **It carries no entrance**: a block that fades in is a block that is not
there on frame one, and the first witness made the viewer wait for scene two to
learn what the video was about.

### `cards` — a role and a text, and `items` is now the exception

A card declares **a role and a text**, never a y, a size, a face or a colour. The
roles and their scale live in `ethni_type.py`.

`items` still works and is the escape hatch for a composition no role covers. A
project that reaches for it twice has found a missing role: add the role.

**The register is pinned at y 200; the content is distributed below it.** `serie`
and `date` stay at the top of the frame; the figures, the prose and the plaque are
one group, spaced at a capped gap and centred between the register and the caption
band. Packing everything downward at one gap put a whole scene in the top third
with fifty pixels between a series line and the name it labels. See `stack`.

**Everything is white, and gold is spent once per frame** — on the name the scene
is examining. A scene that would spend it twice fails.

### `cue` — the entrance is anchored on the spoken word

    "cue": {"word": "notre", "nth": 2, "offset": -1.20}

is resolved against `work/aligned-words.json` at every render, so a new take moves
the card with the voice. A numeric `"delay"` in seconds stays legal for a card
that answers to no word.

This is not a convenience. Sénégal's own renderer hard-coded its delays, and when
the second Ines take moved every word the approved delays fired « SUNU GAAL »
**1.96 s before** « notre pirogue » was spoken. It solved that with a private
anchor table no other project inherited. The table is now a field.

### The safe box is measured, not assumed

At the approved burn settings a two-line caption occupies y 1127–1420, the credit
line y 1490–1560, and the brand lockup x 650–1046 · y 1795–1888. So a card may
occupy **y 150–1100, x 120–960**, and ink outside that box fails the render rather
than being drawn under a caption.
"""
import pathlib, os, sys, json, math, subprocess, shutil
from PIL import Image, ImageDraw, ImageFont, ImageOps
import numpy as np
from ethni_brand import draw_lockup, lockup_size
from ethni_paths import resolve_project
import ethni_compose_v1 as compose
import ethni_plaque as plaque_figure
import ethni_type as typo

HARNESS = pathlib.Path(__file__).resolve().parent
ROOT = resolve_project(sys.argv[1] if len(sys.argv) > 1 else None)
W, H, FPS = 1080, 1920, 25

# §9 bis — **the last image is the closing, and nothing after it.** This module
# used to append an approved ending: parchment ground, colour lockup, a slogan and
# a wall of five social handles. It never added to the closing, it replaced it, so
# the film ended on an address rather than on the argument. Nothing takes its
# place; the social handles live in the publication's description, where they are
# clickable, and never burned into the image, where they are not.

# One palette for the harness, read from the charter by `ethni_tokens`. This
# module used to keep a second copy, which is how the video and the card could
# disagree about the same colour without either looking wrong on its own.
PALETTE = typo.PALETTE

# Measured at the approved burn settings rather than assumed: a two-line caption
# occupies y 1127–1420, the on-screen credit y 1490–1560, and the brand lockup
# x 650–1046 · y 1795–1888. Everything below SAFE_BOTTOM is already spoken for.
SAFE_TOP, SAFE_BOTTOM = 150, 1100
SAFE_LEFT, SAFE_RIGHT = 120, 960
SAFE_FRAC = (SAFE_RIGHT - SAFE_LEFT) / W


def geom(scales, role):
    """(virtual width, safe fraction) for one role at its solved size.

    Type is measured against a virtual width, so the size is a choice and the
    centring still happens on the real frame — the same trick the carousel uses
    to give one deck one scale across three formats.
    """
    k = (scales or {}).get(role, 1.0)
    return W * k, SAFE_FRAC / k
BLOCK_TOP = 200             # where the register sits, on every scene
BLOCK_GAP = 48              # between the two lines of the register itself
# The register labels the frame; the content is what the frame is about, and the
# two are not the same object. Measured on the witnesses of 2026-09-09: packed at
# one gap they read as one crammed block in the top third, under six hundred
# pixels of empty photograph.
REGISTER_ROLES = ("serie", "date")
REGISTER_CLEAR = 140        # minimum between the register and the content below it
# A plate is not shaded the way a photograph is, so the register keeps whatever
# contrast the document's own paper gives it. Measured 2026-09-10 over the ten
# plate scenes of five projects: on the six that clear this band the register
# reads at 14.0 against the green ground, and on the four that did not it fell to
# 1.2–2.9 — below the 3.0 floor for large text, and invisible on two of them. The
# fix is separation, not shading: darkening the plate veils a document whose
# legibility is the argument, and neither shading nor a dark register would undo
# the second half of the defect, which is the register landing on the document's
# own typography. Libreville found this by hand and its SOURCES.md §6 records it.
PLATE_REGISTER_CLEAR = 8    # between the register's ink and the top of a plate
CONTENT_GAP_MIN = 72        # between two content blocks, never tighter
CONTENT_GAP_MAX = 220       # space-between, capped, or two cards drift apart

# The doctrine caps colour-ground-with-text at 2 % of running time, ideally 1 %.
# Measured on the two approved masters: Ghana 0.0 %, Sénégal V2 15.9 % — five and
# a half seconds of flat #142B25 that its own DEVIATIONS.md does not record. So
# the share is measured at every render and written into validation.json. It is
# a reported figure and not yet a gate; see the note of 2026-09-09.
COLOUR_GROUND_CAP = 0.02


def colour(name):
    return PALETTE.get(name, name)


def run(c):
    subprocess.run(c, check=True)


def probe(f):
    return json.loads(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(f)]))


def ease(t):
    return 1 - (1 - max(0, min(1, t))) ** 3


fonts = {}
# Anton, TikTok Sans, Fraunces and Nunito Sans carry no Ethiopic and no polytonic
# Greek: a card set in them renders the string as empty boxes. The two Noto faces
# (SIL OFL, see fonts/OFL-Noto.txt) are the fallback for a scene that has to show a
# name in its own script.
FACES = {"anton": "Anton-Regular.ttf", "sans": "TikTokSans-Bold.ttf",
         "brand": "Fraunces.ttf", "serif": "Fraunces.ttf", "nunito": "NunitoSans.ttf",
         "ethiopic": "NotoSansEthiopic-Bold.ttf", "greek": "NotoSans-Bold.ttf"}


def font(sz, face="sans", weight=800):
    key = (sz, face, weight)
    if key not in fonts:
        f = ImageFont.truetype(str(HARNESS / "fonts" / FACES[face]), sz)
        if face in ("brand", "serif", "nunito"):
            # Fraunces and Nunito Sans ship as variable fonts whose default instance
            # is far too light for a title; pin the axis or the card renders as a wisp.
            values = [weight if a["name"] in ["Weight", b"Weight"] else a["default"]
                      for a in f.get_variation_axes()]
            f.set_variation_by_axes(values)
        fonts[key] = f
    return fonts[key]


def text_layer(lines, y, sz=80, face="anton", color=None, gap=16, maxw=840, weight=800):
    color = PALETTE["ink"] if color is None else color
    if isinstance(lines, str):
        lines = [lines]
    im = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(im)
    for line in lines:
        f = font(sz, face, weight)
        b = d.textbbox((0, 0), line, font=f)
        # A line wider than the safe box is a layout fault, not something to shrink
        # silently: it means the copy and the size disagree and a human must choose.
        assert b[2] - b[0] <= maxw, (line, b[2] - b[0], maxw, sz)
        d.text(((W - b[2] + b[0]) / 2 - b[0], y - b[1]), line, font=f, fill=color)
        y += b[3] - b[1] + gap
    return im


def apply(im, layer, t, start=0, dur=.45):
    a = ease((t - start) / dur)
    if a <= 0:
        return
    layer = layer.copy()
    if a < 1:
        layer.putalpha(layer.getchannel("A").point(lambda x: round(x * a)))
    im.alpha_composite(layer, (0, round(24 * (1 - a))))


def resolve_cue(spec, words, scene_start, what):
    """Seconds into its own scene at which a card enters, from the paced take.

    A hard-coded delay ties a card to one take. Sénégal's approved delays fired
    « SUNU GAAL » 1.96 s before « notre pirogue » was spoken once the second Ines
    take moved every word, and the fix lived in that one project. It lives here.
    """
    if spec is None:
        return None
    word, nth = spec["word"], spec.get("nth", 1)
    hits = [w for w in words if w["word"] == word]
    assert len(hits) >= nth, (
        f"{what} : « {word} » apparaît {len(hits)} fois dans la narration pacée, "
        f"il en faut au moins {nth} — vérifie le mot tel que l'aligneur l'écrit "
        f"(ponctuation comprise) dans work/aligned-words.json")
    delay = round(hits[nth - 1]["start"] + spec.get("offset", 0.0) - scene_start, 2)
    assert delay >= 0, (
        f"{what} : le mot « {word} » est prononcé {abs(delay)} s avant le début de "
        f"sa propre scène — la carte est dans la mauvaise scène, ou l'offset est trop grand")
    return delay


def stack(cards, plaque_height=0, scales=None):
    """Vertical placement for a scene's cards. Two zones, not one stack.

    **The register is pinned at the top; the content is distributed below it.**

    Everything used to pack downward from `BLOCK_TOP` at one 48 px gap. Measured on
    the two witnesses: a scene carrying a series line and one figure put all its ink
    between y 200 and y 504 of a 950 px safe box, with fifty pixels between the
    series line and the name it labels, and six hundred pixels of empty photograph
    underneath. The operator's ruling on that render: « tout est trop collé […] il
    faudrait qu'on soit en space between ou space around ».

    So:

    - `serie` and `date` are the register. They stay at `BLOCK_TOP`, because a
      rubric belongs at the top of the frame and nowhere else.
    - Everything else — the figures, the prose, the plaque — is one group, spaced
      apart at `CONTENT_GAP` (space-between, capped) and centred in what is left
      between the register and the caption band (space-around).

    This is not a return to the two anchors that were removed on 2026-09-09. That
    version had one block growing down from the top and another computed backwards
    from the caption band, and the void appeared *between two groups that did not
    know about each other*. Here there is one free band, measured, and one group
    centred inside it: it cannot leave a hole it did not choose.
    """
    scales = scales or {}
    heights = [typo.measure(c, *geom(scales, c["role"])) for c in cards]
    reg = [i for i, c in enumerate(cards) if c["role"] in REGISTER_ROLES]
    body = [i for i, c in enumerate(cards) if c["role"] not in REGISTER_ROLES]

    tops = [0] * len(cards)
    y = BLOCK_TOP
    for i in reg:
        tops[i] = y
        y += heights[i] + BLOCK_GAP
    register_bottom = y - BLOCK_GAP if reg else BLOCK_TOP

    blocks = [heights[i] for i in body] + ([plaque_height] if plaque_height else [])
    if not blocks:
        return tops, register_bottom

    free_top = register_bottom + (REGISTER_CLEAR if reg else 0)
    free = SAFE_BOTTOM - free_top
    n = len(blocks)
    gap = CONTENT_GAP_MIN if n < 2 else max(
        CONTENT_GAP_MIN, min(CONTENT_GAP_MAX, (free - sum(blocks)) / (n - 1)))
    need = sum(blocks) + gap * (n - 1)
    assert need <= free, (
        f"la scène demande {round(need)} px de contenu sous son registre, et il n'y "
        f"a que {round(free)} px entre y={round(free_top)} et la bande des "
        f"sous-titres (y {SAFE_BOTTOM}) — retire une carte")

    y = free_top + (free - need) / 2
    for i in body:
        tops[i] = round(y)
        y += heights[i] + gap
    return tops, round(y)


def solve_role_scales(scenes):
    """One type size per role for the whole video, solved against the copy.

    The opening block has solved its own scale since the evening of 2026-09-09;
    the scene cards had none and used the fixed sizes of `ethni_type.ROLES`.
    Measured on approved copy the same day: « MIKUNDUKHU » (narration 8) came out
    850 px in an 840 px box, and « IMPATIENS NIAMNIAMENSIS » (narration 6) 1333 px.
    Two of the thirteen videos could not have been rendered at all, and the copy is
    frozen, so it is the size that gives way.

    **Per role, not per video.** One scale for the whole video was tried first and
    rejected by measurement: a single twenty-three-character binomial dragged every
    other role down with it and put the series line at 24 px. A role that fits has
    no reason to shrink because another one does not.

    **Per video, not per scene.** A role keeps one size from the first frame to the
    last. The series line appears on every scene, and a series line that changes
    size between two scenes reads as two different series.
    """
    roles = {}
    for sc in scenes:
        for c in sc.get("cards", []):
            roles.setdefault(c["role"], []).append(c)
    # The register owns the top of the frame; the content owns what is left under
    # it. Solving a content role against the whole safe box would let it pass here
    # and then fail in `stack`, which is a size chosen twice and refused once.
    band = SAFE_BOTTOM - BLOCK_TOP
    content_band = band - REGISTER_CLEAR - 80
    out = {}
    for role, cards in roles.items():
        here = band if role in REGISTER_ROLES else content_band
        out[role] = compose.solve_scale(
            lambda k, cards=cards: max(typo.measure(c, W * k, SAFE_FRAC / k) for c in cards),
            here)
    plaques = [sc["plaque"] for sc in scenes if sc.get("plaque")]
    if plaques:
        out["plaque"] = compose.solve_scale(
            lambda k: max(plaque_figure.measure(q, W * k, SAFE_FRAC / k) for q in plaques),
            content_band)
    return out


def assert_in_safe_box(box, what):
    """Refuse ink outside the measured safe box rather than draw it under a caption."""
    if box is None:
        return
    x0, y0, x1, y1 = box
    assert y0 >= SAFE_TOP and y1 <= SAFE_BOTTOM, (
        f"{what} occupe y {y0}–{y1}, hors de la zone sûre y {SAFE_TOP}–{SAFE_BOTTOM} : "
        f"les sous-titres commencent à y 1127 et le crédit à y 1490")
    assert x0 >= SAFE_LEFT and x1 <= SAFE_RIGHT, (
        f"{what} occupe x {x0}–{x1}, hors de la zone sûre x {SAFE_LEFT}–{SAFE_RIGHT}")


def colour_ground_share(path, until):
    """How much of the content runs on a flat field, measured rather than declared.

    The doctrine caps colour-ground-with-text at 2 % of running time, and nothing
    ever measured it. Ghana comes in at 0.0 %; Sénégal V2 at 15.9 %, five and a
    half seconds of flat #142B25 that its own DEVIATIONS.md does not record.

    The window is the whole film. It used to stop at the brand ending, which was
    deliberately exempt; §9 bis retired that card, so there is nothing left to
    exempt and nothing left to stop before.

    A darkened photograph keeps chroma variety everywhere, so per-frame standard
    deviation separates the two cleanly without needing to know the sheet's colour.
    """
    if until <= 0:
        return {"seconds": 0.0, "share": 0.0, "cap": COLOUR_GROUND_CAP, "within_cap": True}
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-t", f"{until:.3f}", "-i", str(path),
         "-vf", "fps=4,scale=108:192", "-pix_fmt", "rgb24", "-f", "rawvideo", "-"],
        capture_output=True).stdout
    n = len(raw) // (108 * 192 * 3)
    if not n:
        return {"seconds": 0.0, "share": 0.0, "cap": COLOUR_GROUND_CAP, "within_cap": True}
    frames = np.frombuffer(raw[:n * 108 * 192 * 3], dtype=np.uint8) \
               .reshape(n, 192, 108, 3).astype(np.int16)
    flat = (frames.reshape(n, -1, 3).std(axis=1).mean(axis=1) < 14)
    seconds = round(flat.sum() / 4, 2)
    share = round(float(flat.mean()), 4)
    return {"seconds": seconds, "share": share, "cap": COLOUR_GROUND_CAP,
            "measured_over_seconds": round(until, 2),
            "within_cap": share <= COLOUR_GROUND_CAP}


def note_layer(lines, top=200):
    im = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((120, top, 920, top + 52 * len(lines) + 28), 18, fill=(251, 247, 242, 245))
    for i, line in enumerate(lines):
        f = font(29, "sans")
        assert d.textlength(line, font=f) < 748, line
        d.text((146, top + 15 + i * 52), line, font=f, fill=PALETTE["ink"])
    return im


def photo_canvas(path):
    """Crop-to-fill for a photographic scene, shaded so titles and captions stay readable."""
    p = Image.open(path)
    # A sourced photograph may carry an orientation tag; without this it renders
    # sideways, which cost one render on the Sénégal short.
    p = ImageOps.exif_transpose(p).convert("RGB")
    p = ImageOps.fit(p, (W, H), Image.Resampling.LANCZOS, centering=(.5, .45)).convert("RGBA")
    shade = Image.new("RGBA", (W, H))
    a = np.zeros((H, W), dtype=np.uint8)
    for y in range(H):
        a[y, :] = int(70 + 105 * max(0, 1 - abs(y - 300) / 580) + 95 * max(0, (y - 1050) / 870))
    shade.putalpha(Image.fromarray(a))
    p.alpha_composite(shade)
    return p


def plate(path, width, centre_y, keep_top=1.0):
    """A document is evidence, so it is fitted to width and never cropped sideways.

    Cropping a map or a chart to fill a portrait frame removes exactly the part the
    video is arguing about. `keep_top` trims only a blank band that carries none of
    the argument.
    """
    m = Image.open(path)
    m = ImageOps.exif_transpose(m).convert("RGB")
    if keep_top < 1.0:
        m = m.crop((0, 0, m.width, round(m.height * keep_top)))
    height = round(m.height * width / m.width)
    m = m.resize((width, height), Image.Resampling.LANCZOS).convert("RGBA")
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    top = round(centre_y - height / 2)
    out.alpha_composite(m, ((W - width) // 2, top))
    return out, (top, top + height)


def assert_plate_clears_register(span, bg, register_ink, scene):
    """A document may not climb into the register's ink.

    The register is white and a plate is not shaded, so a pale document simply
    swallows it — measured at a contrast of 1.2 on the Brazzaville report, which
    is no contrast at all. Lowering the plate is what Libreville did by hand and
    it costs nothing: the four scenes this refused all fitted the frame whole
    once moved. The failure names the `centreY` that clears the register, because
    a constraint the operator has to solve by trial is a constraint that gets
    worked around instead.
    """
    if not register_ink:
        return
    top, bottom = span
    floor = max(box[3] for box in register_ink) + PLATE_REGISTER_CLEAR
    if top >= floor:
        return
    height = bottom - top
    centre_y = bg.get("centreY", H // 2) + (floor - top)
    # `plate` rounds the top edge from a half-pixel centre, so an odd height lands
    # this suggestion one pixel short of the floor and the next run fails again on
    # the value this message gave. Solve it here rather than hand it back.
    while round(centre_y - height / 2) < floor:
        centre_y += 1
    if round(centre_y - height / 2) + height > H:
        raise AssertionError(
            f"scène {scene} : la planche « {bg['asset']} » monte jusqu'à y={top}, "
            f"dans l'encre du registre qui descend à "
            f"y={floor - PLATE_REGISTER_CLEAR}, et l'abaisser la ferait sortir du "
            f"cadre par le bas. Elle fait {height} px de haut pour {H - floor} px "
            f"disponibles sous le registre : réduis « width » à "
            f"{round(bg.get('width', 1010) * (H - floor) / height)} environ, puis "
            f"reprends le centreY")
    raise AssertionError(
        f"scène {scene} : la planche « {bg['asset']} » monte jusqu'à y={top} et "
        f"recouvre le registre, dont l'encre descend à y={floor - PLATE_REGISTER_CLEAR}. "
        f"Le registre est blanc et une planche n'est pas assombrie, donc il y "
        f"disparaît — passe « centreY » de {bg.get('centreY', H // 2)} à {centre_y}")


# ── the brand ending's typographic card, rebuilt only for the logo entrance ──────
logo = Image.open(HARNESS / "ethniafrica-logo.png").convert("RGBA")
logo = logo.crop(logo.getbbox())


def main():
    sheet = json.loads((ROOT / "scenes.json").read_text(encoding="utf-8"))
    # The project's dark ground, not a second one. `PALETTE["green"]` was
    # `#142B25`, a value the charter never defined; it was deleted on 2026-09-10
    # rather than tokenised, because a second unrecorded dark ground is how a
    # colour becomes a decision by habit.
    bg_default = sheet.get("background", PALETTE["ground"])
    assets = ROOT / "assets"
    work = ROOT / "work"
    os.chdir(work)

    starts = json.loads((work / "scene-starts.json").read_text())
    scenes = sheet["scenes"]
    assert len(scenes) == len(starts), (
        f"{len(scenes)} scenes in scenes.json but {len(starts)} narration paragraphs")

    audio_dur = float(probe("narration.wav")["format"]["duration"])
    total = math.ceil((audio_dur + 2) * FPS) / FPS
    starts[0] = 0

    # The mark is burned into every content frame, and it is the SAME lockup the
    # post images carry — one module, so the two surfaces cannot drift. It sits
    # below the on-screen credits and clear of the caption band, which ends at
    # y 1421 at the approved burn settings.
    # Bottom-right, absolutely positioned — it does not join the centred stack.
    # Built once: the tagline gradient is O(width) and would otherwise be recomputed
    # on every one of a thousand frames.
    bw, bh = lockup_size(W)
    assert bw < W * .55 and bh < H * .08, (bw, bh)
    brand_layer = draw_lockup(Image.new("RGBA", (W, H)))

    # The word timings of the FINAL paced take, so a `cue` moves with the voice.
    aligned = json.loads((work / "aligned-words.json").read_text(encoding="utf-8"))

    # One type scale for every scene card of this video, solved against the copy
    # rather than fixed. The opening block solves its own; this is the rest.
    scales = solve_role_scales(scenes)
    for role, k in sorted(scales.items()):
        if k < 0.999:
            print(f"ÉCHELLE « {role} » {k:.3f} — la copie ne tient pas à la taille "
                  f"nominale et c'est la taille qui cède", flush=True)

    # Pre-build every layer so a copy fault fails before a single frame is encoded.
    built = []
    for i, s_ in enumerate(scenes):
        items = [(text_layer(it["text"], it["y"], it.get("size", 80), it.get("face", "anton"),
                             colour(it.get("colour", "paper")), it.get("gap", 16),
                             it.get("maxw", 840), it.get("weight", 800)), it.get("delay", 0))
                 for it in s_.get("items", [])]

        # The grammar: a card declares a role and a text, and the role carries the
        # rest. Blocks are laid out here so a stack that does not fit fails before
        # a frame exists rather than being drawn under a caption.
        cards = s_.get("cards", [])
        pq = s_.get("plaque")
        pq_height = plaque_figure.measure(pq, *geom(scales, "plaque")) if pq else 0
        # The opening block. It is the carousel cover, in the video, drawn by the
        # same composer — and it carries NO entrance, because the operator's whole
        # complaint was that the first frame did not yet say what the video is
        # about. A block that fades in is a block that is not there on frame one.
        opening = None
        if s_.get("ouverture"):
            spec = s_["ouverture"]
            compose.check_card(spec, "couverture", f"scène {i}, ouverture")
            band = SAFE_BOTTOM - SAFE_TOP
            scale = compose.solve_scale(
                lambda k: compose.height(spec, "couverture", W * k, SAFE_FRAC / k), band)
            tw, mf = W * scale, SAFE_FRAC / scale
            opening = Image.new("RGBA", (W, H))
            box = compose.draw(opening, spec, "couverture", SAFE_TOP, tw, mf)
            assert_in_safe_box(box, f"scène {i}, ouverture")

        drawn, card_layers, register_ink = [], [], []
        tops, after_cards = stack(cards, pq_height, scales)
        for card, top in zip(cards, tops):
            layer = Image.new("RGBA", (W, H))
            box = typo.draw(layer, card, top, *geom(scales, card["role"]))
            assert_in_safe_box(box, f"scène {i}, carte « {card['role']} »")
            drawn.append((f"carte « {card['role']} »", box))
            if card["role"] in REGISTER_ROLES:
                register_ink.append(box)
            delay = resolve_cue(card.get("cue"), aligned, starts[i],
                                f"scène {i}, carte « {card['role']} »")
            card_layers.append((layer, card.get("delay", 0) if delay is None else delay))

        plaque = None
        if pq:
            top = after_cards
            trial = Image.new("RGBA", (W, H))
            pq_box = plaque_figure.draw(trial, pq, top, None, *geom(scales, "plaque"))
            assert_in_safe_box(pq_box, f"scène {i}, plaque")
            # The plaque is centred and the blocks grow towards it from both ends,
            # so a scene that carries a plaque and a full stack can collide without
            # either of them leaving the safe box.
            for what, box in drawn:
                assert box[3] <= pq_box[1] or box[1] >= pq_box[3], (
                    f"scène {i} : la plaque occupe y {pq_box[1]}–{pq_box[3]} et la "
                    f"{what} y {box[1]}–{box[3]} — elles se recouvrent")
            # Measured on the first witness render, and it is not a collision. The
            # rule is engraved 0.2 s before the proper name arrives, and for those
            # five frames the eye completes the figure with whatever sits below the
            # rule. With a « forme » card in `bas` the frame read « KROU → CRUA » —
            # a statement the corpus does not make, on screen, in an approved
            # composition. A plaque is therefore the scene's whole statement, and
            # admits only the two roles that label it.
            for card in cards:
                assert card["role"] in ("serie", "date"), (
                    f"scène {i} : une plaque ne partage sa scène qu'avec « serie » ou "
                    f"« date ». « {card['role']} » se lira comme la seconde moitié de "
                    f"la plaque tant que le nom propre n'est pas entré — donne-lui "
                    f"sa propre scène")
            if s_.get("note"):
                note_bottom = s_["note"].get("top", 200) + 52 * len(s_["note"]["lines"]) + 28
                assert top > note_bottom, (
                    f"scène {i} : la plaque commence à y={top} et le cartouche de "
                    f"source descend à y={note_bottom} — elles se recouvrent")
            plaque = (pq, top,
                      resolve_cue(pq.get("cue"), aligned, starts[i], f"scène {i}, plaque"))

        anno = note_layer(s_["note"]["lines"], s_["note"].get("top", 200)) if s_.get("note") else None
        credits = [text_layer(line, 1490 + j * 42, 25, "sans", PALETTE["paper"], maxw=890)
                   for j, line in enumerate(s_.get("credit", []))]
        bg = s_.get("bg", {"kind": "colour"})
        if bg["kind"] == "photo":
            canvas = photo_canvas(assets / bg["asset"])
        elif bg["kind"] == "plate":
            canvas, span = plate(assets / bg["asset"], bg.get("width", 1010),
                                 bg.get("centreY", H // 2), bg.get("keepTop", 1.0))
            assert_plate_clears_register(span, bg, register_ink, i)
        else:
            canvas = None
        # A sourced visual states its licence on screen, or it does not ship.
        assert bg["kind"] == "colour" or s_.get("credit"), f"visual without a credit line: {bg}"
        built.append((bg, canvas, items, card_layers, anno, credits, plaque, opening))

    parts = []
    for i, start in enumerate(starts):
        end = starts[i + 1] if i < len(starts) - 1 else total
        n = round(end * FPS) - round(start * FPS)
        assert n > 0, (i, start, end)
        part = work / f"scene-{i}.mp4"
        parts.append(part.name)
        enc = subprocess.Popen(
            ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
             "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
             "-preset", "ultrafast", "-crf", "18", "-pix_fmt", "yuv420p", "-threads", "4",
             str(part)], stdin=subprocess.PIPE)

        bg, canvas, items, card_layers, anno, credits, plaque, opening = built[i]
        # The plaque's rule is engraved left to right, so it cannot be one
        # pre-built layer. It is drawn per frame only while it is moving —
        # about twenty-four frames — and cached settled for the rest.
        plaque_cache = {}

        for frame in range(n):
            t = frame / FPS
            if bg["kind"] == "photo":
                zoom = bg.get("zoom", 0.035)
                scale = 1 + zoom * frame / max(1, n - 1)
                bw, bh = round(W * scale), round(H * scale)
                big = canvas.resize((bw, bh), Image.Resampling.BILINEAR)
                im = big.crop(((bw - W) // 2, (bh - H) // 2, (bw + W) // 2, (bh + H) // 2))
            else:
                im = Image.new("RGBA", (W, H), bg.get("colour", bg_default))
                if canvas is not None:
                    im.alpha_composite(canvas)
            if opening is not None:
                im.alpha_composite(opening)
            for layer, delay in items:
                apply(im, layer, t, delay)
            for layer, delay in card_layers:
                typo.enter(im, layer, t, delay)
            if plaque:
                spec, top, delay = plaque
                local = t - (delay or 0)
                if local >= 0:
                    key = round(min(local, plaque_figure.settled_at()) * FPS)
                    if key not in plaque_cache:
                        layer = Image.new("RGBA", (W, H))
                        plaque_figure.draw(layer, spec, top, key / FPS,
                                           *geom(scales, "plaque"))
                        plaque_cache[key] = layer
                    im.alpha_composite(plaque_cache[key])
            if anno:
                im.alpha_composite(anno)
            for c in credits:
                im.alpha_composite(c)
            im.alpha_composite(brand_layer)
            enc.stdin.write(im.convert("RGB").tobytes())
        enc.stdin.close()
        assert enc.wait() == 0
        print("SCENE", i, round(start, 2), round(end, 2), flush=True)

    (work / "concat.txt").write_text("".join(f"file '{x}'\n" for x in parts))
    run(["ffmpeg", "-y", "-v", "error", "-filter_threads", "2", "-f", "concat", "-safe", "0",
         "-i", "concat.txt", "-i", "narration.wav", "-map", "0:v", "-map", "1:a", "-af", "apad",
         "-t", str(total), "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-threads", "4",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
         "master.mp4"])

    shutil.copy(HARNESS / "gold_burn.py", work / "gold_burn.py")
    env = dict(os.environ, HF_WORKFLOWS=str(HARNESS / "hf-workflows"))
    # --gap 0.001 rather than 0: with 0, consecutive burn windows share an endpoint
    # and ffmpeg's between() is inclusive at both ends, so a frame landing exactly on
    # a boundary draws two captions over each other.
    subprocess.run([sys.executable, "gold_burn.py", "--in", "master.mp4", "--srt", "caps.srt",
                    "--out", "final.mp4", "--style", "bold", "--font-key", "anton",
                    "--fontsize-frac", ".052", "--bottom-frac", ".24", "--maxw-frac", ".74",
                    "--stroke-frac", ".06", "--min-dur", ".3", "--gap", "0.001", "--tail", ".18",
                    "--bridge", ".3"], check=True, env=env)

    r = probe("final.mp4")
    v = next(s for s in r["streams"] if s["codec_type"] == "video")
    a = next(s for s in r["streams"] if s["codec_type"] == "audio")
    assert (v["width"], v["height"], v["r_frame_rate"]) == (W, H, "25/1")
    assert abs(float(v["duration"]) - float(a["duration"])) < .2

    def ahash(f):
        return subprocess.check_output(
            ["ffmpeg", "-v", "error", "-i", f, "-map", "0:a", "-c", "copy",
             "-f", "hash", "-hash", "sha256", "-"]).decode().strip()

    # Burning captions must not re-encode the audio: identical hashes prove that no
    # approved sentence moved.
    assert ahash("final.mp4") == ahash("master.mp4")
    run(["ffmpeg", "-v", "error", "-i", "final.mp4", "-f", "null", "-"])

    # The finished video inherits its sources' obligations, and the description is
    # the only place that can carry them. Seven videos shipped without the line
    # because the engine computed it for a carousel and not for a film, so the
    # licence is reported here, in the same file as everything else it validated.
    licence = compose.derived_licence(
        [line for s_ in scenes for line in s_.get("credit", [])])

    (work / "validation.json").write_text(json.dumps({
        "duration": total, "narration_duration": audio_dur, "fps": FPS, "size": [W, H],
        "licence": licence,
        "scenes": len(scenes), "complete_decode": True,
        "audio_hash_matches_clean_master": True, "audio_sha256": ahash("final.mp4"),
        # §9 bis — the film ends on its closing scene, so there is no ending to
        # place and nothing to clear: the five fields that measured the handles
        # against the caption band went with the card they described.
        "last_scene_is_closing": True,
        "last_caption_end": last_caption_end,
        "colour_ground": colour_ground_share("final.mp4", total)}, indent=2))
    if licence:
        print(f"LICENCE {licence} — dernière ligne de la description, sur les cinq "
              f"réseaux : « Vidéo sous {licence}, crédits des images dans le film. »",
              flush=True)
    print("VALIDATED", total, flush=True)


if __name__ == "__main__":
    main()
