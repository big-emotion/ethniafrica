"""The EthniAfrica lockup, drawn once and shared by the card and the video.

One module, imported by `ethni_card.py` and `ethni_render.py`, because the mark on
a post image and the mark on a video frame have to be the same thing — and two
implementations of "the same thing" are two implementations that drift.

It sits in the **bottom-right corner, absolutely positioned**, independent of the
centred stack the rest of the frame is built on.

Reproduced from `01-Brand/Source/ethniafrica_lockup.png` rather than invented. The
frozen rule is that **« Atlas des Peuples d'Afrique » sits directly beneath
« EthniAfrica »**, in the warm orange-to-gold treatment. It is not a strapline that
can be swapped for a handle — a first pass here did exactly that and was wrong.

The wordmark is drawn in white rather than the brand's dark brown because the
ground is a darkened photograph, not parchment. The tagline keeps its gradient: it
reads on dark, and it is the half that carries the warmth.
"""
import pathlib
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

HARNESS = pathlib.Path(__file__).resolve().parent

TAGLINE = "Atlas des Peuples d'Afrique"
WHITE = "#FFFFFF"
FLAME = (218, 98, 47)      # #DA622F
GOLD_INK = (242, 186, 54)  # #F2BA36

# Sized at 1080 px wide and scaled from there. Smaller than a title on purpose: a
# watermark that competes with the headline stops being a watermark.
ICON_PX, NAME_PX, TAG_PX, GAP_PX = 60, 38, 21, 15
MARGIN_FRAC = 0.045   # even breathing room on both edges of the corner

_LOGO = None
_fonts = {}


def logo():
    global _LOGO
    if _LOGO is None:
        im = Image.open(HARNESS / "ethniafrica-logo.png").convert("RGBA")
        _LOGO = im.crop(im.getbbox())
    return _LOGO


def _fraunces(size, weight):
    key = (size, weight)
    if key not in _fonts:
        f = ImageFont.truetype(str(HARNESS / "fonts" / "Fraunces.ttf"), size)
        # Fraunces ships variable and its default instance is a wisp; pin the axis.
        f.set_variation_by_axes(
            [weight if a["name"] in ["Weight", b"Weight"] else a["default"]
             for a in f.get_variation_axes()])
        _fonts[key] = f
    return _fonts[key]


def lockup_size(width, scale=1.0):
    """Pixel footprint of the lockup, so a caller can keep other furniture clear of it."""
    k = scale * width / 1080
    name_f, tag_f = _fraunces(round(NAME_PX * k), 900), _fraunces(round(TAG_PX * k), 700)
    d = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    nb = d.textbbox((0, 0), "EthniAfrica", font=name_f)
    tb = d.textbbox((0, 0), TAGLINE, font=tag_f)
    icon = round(ICON_PX * k)
    h = (nb[3] - nb[1]) + round(9 * k) + (tb[3] - tb[1])
    w = icon + round(GAP_PX * k) + max(nb[2] - nb[0], tb[2] - tb[0])
    return w, max(h, icon)


# §7 bis — the watermark's height at k = 1, half the lockup's.
FILIGRANE_PX = 30
FILIGRANE_OPACITE = 0.55

_FILIGRANES = {}


def filigrane(hauteur, encre, opacite=FILIGRANE_OPACITE):
    """§7 bis — the mark as a watermark: monochrome, half-height, one flat ink.

    **It is a watermark, not a signature.** It exists so the card is recognisable
    when it circulates out of context, and for nothing else — it carries no role in
    the composition. The colour lockup stays for the channel banner and the video
    outros, where the brand *is* the subject; at 30 px it would only read as a
    second accent, and §0.3 allows one.

    Composed large and reduced rather than laid out at final size: at 30 px the
    tagline's stems fall under a pixel and the mark turns to mush.
    """
    cle = (hauteur, tuple(encre), round(opacite, 3))
    if cle in _FILIGRANES:
        return _FILIGRANES[cle]

    k = 2.0
    name_f, tag_f = _fraunces(round(NAME_PX * k), 900), _fraunces(round(TAG_PX * k), 700)
    icon, gap, lead = round(ICON_PX * k), round(GAP_PX * k), round(9 * k)

    toile = Image.new("RGBA", (round(900 * k), round(160 * k)), (0, 0, 0, 0))
    d = ImageDraw.Draw(toile)
    nb = d.textbbox((0, 0), "EthniAfrica", font=name_f)
    tb = d.textbbox((0, 0), TAGLINE, font=tag_f)
    stack_h = (nb[3] - nb[1]) + lead + (tb[3] - tb[1])

    mark = logo().copy()
    mark.thumbnail((icon, icon), Image.Resampling.LANCZOS)
    bloc_h = max(stack_h, mark.height)
    tx, ty = mark.width + gap, (bloc_h - stack_h) / 2

    toile.alpha_composite(mark, (0, round((bloc_h - mark.height) / 2)))
    d.text((tx - nb[0], ty - nb[1]), "EthniAfrica", font=name_f, fill=WHITE)
    d.text((tx - tb[0], ty + (nb[3] - nb[1]) + lead - tb[1]), TAGLINE, font=tag_f, fill=WHITE)

    toile = toile.crop(toile.getbbox())
    toile = toile.resize((max(1, round(toile.width * hauteur / toile.height)), hauteur),
                         Image.Resampling.LANCZOS)

    # The alpha carries the shape; the ink is uniform underneath it.
    plat = Image.new("RGBA", toile.size, tuple(encre) + (0,))
    plat.putalpha(toile.getchannel("A").point(lambda a: round(a * opacite)))
    _FILIGRANES[cle] = plat
    return plat


def draw_lockup(im, scale=1.0):
    """Composite the lockup into the bottom-right corner, with even margins.

    Absolute corner placement, independent of everything else in the frame — the
    operator's ruling, twice given. It is a mark of ownership, not a line of the
    composition, so it does not take part in the centred stack; and a mark that
    always sits in the same corner is the one a viewer stops noticing and a
    reposter cannot crop out without visibly cropping the frame.
    """
    w_im = im.width
    k = scale * w_im / 1080
    margin = round(MARGIN_FRAC * w_im)
    d = ImageDraw.Draw(im)

    mark = logo().copy()
    icon = round(ICON_PX * k)
    mark.thumbnail((icon, icon), Image.Resampling.LANCZOS)

    name_f, tag_f = _fraunces(round(NAME_PX * k), 900), _fraunces(round(TAG_PX * k), 700)
    gap = round(GAP_PX * k)
    nb = d.textbbox((0, 0), "EthniAfrica", font=name_f)
    tb = d.textbbox((0, 0), TAGLINE, font=tag_f)
    text_w = max(nb[2] - nb[0], tb[2] - tb[0])
    lead = round(9 * k)
    stack_h = (nb[3] - nb[1]) + lead + (tb[3] - tb[1])

    block_w = mark.width + gap + text_w
    block_h = max(stack_h, mark.height)
    x = im.width - margin - block_w
    y = im.height - margin - block_h

    tx = x + mark.width + gap
    ty = y + (block_h - stack_h) / 2
    tly = ty + (nb[3] - nb[1]) + lead

    # A soft dark halo behind the whole lockup.
    #
    # The wordmark is white, which was designed against a darkened photograph. On a
    # light ground it disappears: measured on the Lingala short, whose parchment
    # scenes left « EthniAfrica » all but invisible while only the gradient tagline
    # survived. A watermark you cannot see on half your footage is not a watermark,
    # and switching the ink per background would make the mark change identity
    # mid-video. The halo keeps one mark and makes it legible on both.
    halo = Image.new("RGBA", im.size)
    hd = ImageDraw.Draw(halo)
    hd.text((tx - nb[0], ty - nb[1]), "EthniAfrica", font=name_f, fill=(0, 0, 0, 255))
    hd.text((tx - tb[0], tly - tb[1]), TAGLINE, font=tag_f, fill=(0, 0, 0, 255))
    halo.alpha_composite(mark, (x, round(y + (block_h - mark.height) / 2)))
    halo = halo.filter(ImageFilter.GaussianBlur(round(max(2, 7 * k))))
    halo.putalpha(halo.getchannel("A").point(lambda a: min(255, round(a * 2.1))))
    im.alpha_composite(halo)

    im.alpha_composite(mark, (x, round(y + (block_h - mark.height) / 2)))
    d.text((tx - nb[0], ty - nb[1]), "EthniAfrica", font=name_f, fill=WHITE)

    # The tagline is a gradient, so it is drawn as a mask over a ramp rather than in
    # a flat colour — the same treatment the approved brand ending uses.
    tag = Image.new("RGBA", im.size)
    ImageDraw.Draw(tag).text((tx - tb[0], tly - tb[1]), TAGLINE, font=tag_f, fill=WHITE)
    ramp = np.zeros((im.height, im.width, 3), dtype=np.uint8)
    span = max(1, tb[2] - tb[0])
    for px in range(im.width):
        u = max(0.0, min(1.0, (px - tx) / span))
        ramp[:, px] = [round(a * (1 - u) + b * u) for a, b in zip(FLAME, GOLD_INK)]
    grad = Image.fromarray(ramp).convert("RGBA")
    grad.putalpha(tag.getchannel("A"))
    im.alpha_composite(grad)
    return im
