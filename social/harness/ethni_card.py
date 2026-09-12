"""Render the three social post images for a subject, as frames of its own video.

    python3 ethni_card.py <project-dir>

The card the site's own composition produced — parchment, the *planche
onomastique*, an engraved rule — was rejected for social on 2026-09-07: a website
is a place you read, a feed is a place you scroll, and a card that reads like a
page loses to a photograph before its first word. The operator's verdict, holding
a frame of the Lingala video next to its post image, was that the frame *is* the
template.

So this renderer shares its visual language with `ethni_render.py` on purpose —
the same faces, the same gold, the same shading, the same credit line — and the
two surfaces cannot drift, because a post image is now literally a still of the
argument the video makes.

Doctrine: `Gabarits/GABARITS-SOCIAL.md`.

## card.json

    {
      "eyebrow": "LES NOMS ONT UNE HISTOIRE",
      "name":    "LINGALA",
      "turn":    ["INVENTÉ PAR", "LES BELGES ?"],
      "hook":    "LE NOM LINGALA",
      "asset":   "livingstone.jpg",
      "credit":  ["Livingstone à Baringa · Congo · vers 1900–1915",
                  "Archives CSWC / USC · Wikimedia Commons"]
    }

`asset` is a file in the project's `assets/` — a real photograph, engraving, map
or document, licence-verified. There is no generated-image path and there will
not be one.
"""
import pathlib, sys, json
from PIL import Image, ImageDraw, ImageFont, ImageOps
import numpy as np
from ethni_brand import draw_lockup
from ethni_paths import assert_writable, resolve_project
import ethni_plaque as plaque_figure
from ethni_type import FACES, PALETTE, font

HARNESS = pathlib.Path(__file__).resolve().parent

GOLD = PALETTE["gold"]
WHITE = PALETTE["white"]
TAGLINE = "Atlas des Peuples d'Afrique"
# The approved tagline gradient, verbatim from the brand ending.
FLAME = (218, 98, 47)      # #DA622F
GOLD_INK = (242, 186, 54)  # #F2BA36

# The mark travels with the image. A post image is reposted, screenshotted and
# stripped of its caption within a day, and at that point the only thing still
# saying where the claim came from is what is burned into the pixels.
LOGO = Image.open(HARNESS / "ethniafrica-logo.png").convert("RGBA")
LOGO = LOGO.crop(LOGO.getbbox())

# Three geometries, not one image resized. The 9:16 keeps its lower fifth clear —
# TikTok and Instagram paint their own controls over it, and a credit under a
# « Suivre » button is a credit nobody reads.
FORMATS = [
    {"file": "instagram-facebook_1080x1350", "w": 1080, "h": 1350,
     "eyebrow": .085, "name": .150, "turn": .360, "hook": .650, "credit": .775, "scale": 1.00},
    {"file": "tiktok-story_1080x1920", "w": 1080, "h": 1920,
     "eyebrow": .120, "name": .200, "turn": .390, "hook": .688, "credit": .752, "scale": 1.00},
    {"file": "linkedin_1200x1200", "w": 1200, "h": 1200,
     "eyebrow": .075, "name": .140, "turn": .370, "hook": .645, "credit": .772, "scale": 1.02},
]

def fit(draw, lines, face, start, maxw):
    """Largest size at which every line clears the safe box.

    Shrinking to fit is right here and wrong in the video: a caption that does not
    fit is a copy fault a human must see, but a post title is one string on one
    background and the frame is the constraint.
    """
    size = start
    while size > 16:
        f = font(size, face)
        if all(draw.textlength(l, font=f) <= maxw for l in lines):
            return f
        size -= 2
    return font(16, face)


def shaded(path, w, h):
    """Crop-to-fill, darkened top and bottom so the type reads against any photograph.

    The same profile as the video's `photo_canvas`, expressed as fractions of the
    height so it survives the three formats.
    """
    p = Image.open(path)
    p = ImageOps.exif_transpose(p).convert("RGB")
    p = ImageOps.fit(p, (w, h), Image.Resampling.LANCZOS, centering=(.5, .42)).convert("RGBA")
    a = np.zeros((h, w), dtype=np.uint8)
    for y in range(h):
        u = y / h
        a[y, :] = min(255, int(74
                               + 104 * max(0, 1 - abs(u - .16) / .30)
                               + 96 * max(0, (u - .55) / .45)))
    shade = Image.new("RGBA", (w, h))
    shade.putalpha(Image.fromarray(a))
    p.alpha_composite(shade)
    return p


def block(draw, im, lines, y, f, colour, gap_frac=.14):
    for line in lines:
        b = draw.textbbox((0, 0), line, font=f)
        ImageDraw.Draw(im).text(((im.width - b[2] + b[0]) / 2 - b[0], y - b[1]),
                                line, font=f, fill=colour)
        y += (b[3] - b[1]) * (1 + gap_frac)
    return y


def render(card, fmt, assets, out_dir):
    w, h, s = fmt["w"], fmt["h"], fmt["scale"]
    safe = w * .84
    im = shaded(assets / card["asset"], w, h)
    d = ImageDraw.Draw(im)

    eyebrow = [card["eyebrow"].upper()]
    name = [card["name"].upper()]
    turn = [t.upper() for t in ([card["turn"]] if isinstance(card["turn"], str) else card["turn"])]
    hook = [card["hook"].upper()]

    block(d, im, eyebrow, h * fmt["eyebrow"],
          fit(d, eyebrow, "sans", round(30 * s * w / 1080), safe * .95), WHITE)
    block(d, im, name, h * fmt["name"],
          fit(d, name, "anton", round(168 * s * w / 1080), safe), GOLD)
    block(d, im, turn, h * fmt["turn"],
          fit(d, turn, "anton", round(84 * s * w / 1080), safe), WHITE)
    block(d, im, hook, h * fmt["hook"],
          fit(d, hook, "anton", round(80 * s * w / 1080), safe), GOLD)

    credit = list(card["credit"]) + ["ethniafrica.com · @ethniafrica"]
    y = block(d, im, credit, h * fmt["credit"],
              fit(d, credit, "sans", round(25 * s * w / 1080), safe * .95), WHITE, gap_frac=.55)
    draw_lockup(im, s)

    out = out_dir / f"{card['id']}_{fmt['file']}.png"
    im.convert("RGB").save(out)
    return out


def main():
    """Two modes, one renderer.

    A project directory carries `card.json` and its own `assets/`, and writes into
    `card/`. A manifest instead names each subject's `assetPath` and `outDir`
    explicitly, which is how the thirteen already-published subjects were
    re-rendered in place: their photographs live in the production project that
    made the video, not beside the post.
    """
    given = pathlib.Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else None
    target = given.resolve() if given and given.is_file() else resolve_project(
        sys.argv[1] if len(sys.argv) > 1 else None
    )
    if target.is_file():
        cards = json.loads(target.read_text(encoding="utf-8"))
        for card in cards:
            asset = pathlib.Path(card["assetPath"]).expanduser().resolve()
            assert asset.exists(), f"asset not found: {asset}"
            out_dir = assert_writable(
                pathlib.Path(card["outDir"]).expanduser().resolve()
            )
            out_dir.mkdir(parents=True, exist_ok=True)
            card = dict(card, asset=asset.name)
            for fmt in FORMATS:
                print("  ", render(card, fmt, asset.parent, out_dir).name, flush=True)
        print(f"{len(cards) * len(FORMATS)} cards across {len(cards)} subjects", flush=True)
        return

    card = json.loads((target / "card.json").read_text(encoding="utf-8"))
    card.setdefault("id", target.name.lower())
    assets = target / "assets"
    assert (assets / card["asset"]).exists(), f"asset not found: {assets / card['asset']}"
    out_dir = target / "card"
    out_dir.mkdir(exist_ok=True)
    for fmt in FORMATS:
        print("  ", render(card, fmt, assets, out_dir).name, flush=True)
    print(f"{len(FORMATS)} cards for {card['id']}", flush=True)


if __name__ == "__main__":
    main()
