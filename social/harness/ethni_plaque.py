"""The plaque: the imposed name, the engraved rule, the name the people give itself.

One module, imported by `ethni_render.py` and `ethni_card.py`. It is the atlas's
own figure — the thing the whole corpus is about, made visible in one block — and
until now it existed only as a sentence in the guides and as a retired JavaScript
composition that was deleted on 2026-09-09.

    {"accent":  "second",
     "premier": {"text": "Hottentot",
                 "gloss": "forgé par les colons néerlandais du Cap"},
     "second":  {"text": "Khoekhoe",
                 "gloss": "« les hommes des hommes »"}}

## Three rulings, and each of them is an argument

**Stacked, never side by side, on every format including the square.** Two names
on one line read as an equivalence between them, and that equivalence is exactly
what the figure denies. Top to bottom is also the reading order of the sentence
it renders: *ce n'est pas X, c'est Y*.

**One term is gold: the one the card is examining. The other is white.** Which one
is declared, never guessed:

    "accent": "second"    # Krou → **Klao**, the restored name. The usual case.
    "accent": "premier"   # **Fellata** → à éviter. The card is about Fellata.

The default was once « the second term is always gold », and reading the validated
pairs killed it: three of carousel 5's four are not restitutions at all, and
« à éviter » would have been set in the colour reserved for a people's own name.
Gold marks the word under examination, which is the operator's rule for the whole
surface, not a property of the second slot.

**On a darkened photograph, never on a colour ground.** A plaque is a typographic
figure, not a background, so it costs nothing against the doctrine's 2 % cap on
colour grounds — and it is built so that reaching for a flat field is never
necessary. Sénégal V2 measures 15.9 % of its running time on flat `#142B25`,
which is what happens when a figure has nowhere clean to sit.

## A name is an atom; a gloss is a sentence

A name that does not fit its box fails the build, like every other card in
`ethni_type.py`: the copy and the size disagree and a human has to choose. A
gloss wraps, because it is prose and wrapping prose loses nothing.
"""
from PIL import Image, ImageDraw

from ethni_type import PALETTE, REF_W, assert_covered, ease, font

# Measured at 1080 px wide and scaled from there, like every other number in the
# harness. The imposed name is deliberately smaller than the proper one.
PREMIER_PX, SECOND_PX = 132, 132
GLOSS_PX = 36
# A gloss explains the name above it and must not compete with it. Measured on
# the first witness render, TikTok Sans Bold at full white read almost as loud as
# the Anton name; the size difference alone did not carry the hierarchy. Opacity
# is hierarchy, not decoration, so no colour is added to say it.
GLOSS_ALPHA = 0.80
RULE_W, RULE_H = 340, 6
GAP_GLOSS = 24        # between a name and its own gloss
GAP_RULE = 44         # around the rule
LEAD_GLOSS = 8        # between two wrapped gloss lines

# The three stages, in seconds from the plaque's own start. The figure takes its
# drama from sequence, not from a bounce: the imposed name has to be read before
# the correction can land, so the correction waits.
AT_PREMIER, AT_RULE, AT_SECOND = 0.0, 0.35, 0.55
RULE_SECONDS = 0.30


def _wrap(text, f, maxw, measurer):
    lines, current = [], ""
    for word in text.split():
        trial = f"{current} {word}".strip()
        if current and measurer.textlength(trial, font=f) > maxw:
            lines.append(current)
            current = word
        else:
            current = trial
    if current:
        lines.append(current)
    return lines


def _parts(plaque, width, maxw):
    """Every line of the figure with its font, colour and vertical offset."""
    k = width / REF_W
    measurer = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    out, y = [], 0

    def name(block, size, colour, stage):
        nonlocal y
        f = font(round(size * k), block.get("face", "anton"), 800)
        text = block["text"].upper()
        assert_covered(text, block.get("face", "anton"))
        b = measurer.textbbox((0, 0), text, font=f)
        assert b[2] - b[0] <= maxw, (
            f"le nom « {text} » fait {round(b[2] - b[0])} px pour une plaque de "
            f"{round(maxw)} px — un nom ne se rétrécit pas, il se corrige")
        out.append(("text", text, f, PALETTE[colour], y - b[1], stage))
        y += b[3] - b[1]
        gloss = block.get("gloss")
        if gloss:
            g = font(round(GLOSS_PX * k), "sans", 800)
            assert_covered(gloss, "sans")
            y += round(GAP_GLOSS * k)
            for line in _wrap(gloss, g, maxw, measurer):
                gb = measurer.textbbox((0, 0), line, font=g)
                out.append(("gloss", line, g, PALETTE["paper"], y - gb[1], stage))
                y += (gb[3] - gb[1]) + round(LEAD_GLOSS * k)
            y -= round(LEAD_GLOSS * k)

    accent = plaque.get("accent", "second")
    assert accent in ("premier", "second"), (
        f"« accent » vaut {accent!r} : il désigne le terme que la carte examine, "
        f"« premier » ou « second », et rien d'autre")
    name(plaque["premier"], PREMIER_PX,
         "gold" if accent == "premier" else "white", AT_PREMIER)
    y += round(GAP_RULE * k)
    # The rule is the atlas's own line and stays gold whichever term is accented:
    # it is the figure's spine, not a highlight.
    out.append(("rule", None, None, PALETTE["gold"], y, AT_RULE))
    y += round(RULE_H * k) + round(GAP_RULE * k)
    name(plaque["second"], SECOND_PX,
         "gold" if accent == "second" else "white", AT_SECOND)
    return y, out


def measure(plaque, width=REF_W, maxw_frac=840 / REF_W):
    """Height the figure will occupy, so a caller can place it before it exists."""
    return _parts(plaque, width, width * maxw_frac)[0]


def draw(im, plaque, top, t=None, width=None, maxw_frac=840 / REF_W):
    """Composite the figure. `t` in seconds animates it; `None` draws it settled.

    Returns the ink bounding box actually drawn, so the caller asserts against
    its own furniture rather than trusting the arithmetic.
    """
    width = width or im.width
    k = width / REF_W
    _, parts = _parts(plaque, width, width * maxw_frac)
    box = None

    def grow(here):
        nonlocal box
        box = here if box is None else (min(box[0], here[0]), min(box[1], here[1]),
                                        max(box[2], here[2]), max(box[3], here[3]))

    for kind, text, f, colour, dy, stage in parts:
        if kind == "rule":
            # The rule is engraved left to right rather than faded in: a wipe is
            # the gesture of a line being cut, and a line that fades reads as a
            # divider instead of an act.
            span = 1.0 if t is None else ease((t - stage) / RULE_SECONDS)
            if span <= 0:
                continue
            full = round(RULE_W * k)
            w = max(1, round(full * span))
            x0 = (im.width - full) // 2
            y0 = top + dy
            h = max(1, round(RULE_H * k))
            d = ImageDraw.Draw(im)
            # A hairline of ink under the gold reads as an incision on a
            # photograph; the gold alone floats.
            d.rectangle((x0, y0 + h, x0 + w, y0 + h + max(1, round(k))),
                        fill=(0, 0, 0, 90))
            d.rectangle((x0, y0, x0 + w, y0 + h - 1), fill=colour)
            grow((x0, y0, x0 + w, y0 + h))
            continue

        # A stage that has not begun is simply absent; one in progress rises and
        # fades exactly as a card does, so the plaque and the cards share a motion.
        a = 1.0 if t is None else ease((t - stage) / 0.38)
        if a <= 0:
            continue
        if kind == "gloss":
            a *= GLOSS_ALPHA
        layer = Image.new("RGBA", im.size)
        ld = ImageDraw.Draw(layer)
        b = ld.textbbox((0, 0), text, font=f)
        x = (im.width - (b[2] - b[0])) / 2 - b[0]
        ld.text((x, top + dy), text, font=f, fill=colour)
        if a < 1.0:
            layer.putalpha(layer.getchannel("A").point(lambda v: round(v * a)))
        im.alpha_composite(layer, (0, round(24 * (1 - a))))
        grow((round(x + b[0]), round(top + dy + b[1]),
              round(x + b[2]), round(top + dy + b[3])))
    return box


def settled_at():
    """When the whole figure has landed, for a caller sizing a scene or a still."""
    return AT_SECOND + 0.38
