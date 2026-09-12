"""The typographic grammar: what a piece of on-screen text is allowed to be.

One module, imported by `ethni_render.py` and `ethni_card.py`, for the reason
`ethni_brand.py` is one module — two implementations of the same thing are two
implementations that drift.

They already had. The same five editorial objects appear in the Sénégal V2 and
Ghana masters and the two projects agree on none of them: the register line at
y 230 against y 250, the name at 176 px against 200 px, the credit at 1490 + 42 j
against 1486 + 40 j. Neither was a decision; both sessions solved the same layout
by eye and landed a few pixels apart. A third video would have made three answers.

So a project no longer writes a y, a size, a face or a colour. It writes a role
and a text, and the role carries the rest:

    {"role": "nom", "text": "Sénégal"}

Doctrine: `Gabarits/GABARITS-SOCIAL.md`, and the note
`Gabarits/GABARITS-SOCIAL.md` which records what was measured to get here.

## The roles

| Role | What it is |
| --- | --- |
| `serie`    | « LE VRAI NOM · SÉRIE » — this piece belongs to a series |
| `nom`      | The subject, read at thumb speed. **The one gold thing.** |
| `lieu`     | Where that is on today's map — a name with no country has no handle |
| `question` | The astonishment, in the words a stranger would use |
| `titre`    | The point a card makes |
| `corps`    | Plain prose, wrapped |
| `source`   | The claim's source, under the claim, never in the licence line |
| `date`     | The dated, named proof label |
| `chiffre`  | A figure, with its label beneath |
| `mot`      | An African-language word **and its plain-French meaning** |
| `forme`    | A historical or foreign attested spelling. Evidence, so not gold. |
| `citation` | A quoted sentence with its attribution |

`mot` and `forme` are two roles on purpose. Plain-language rule 5 says every
African-language word carries its French meaning on the same card, with no
exception, so a `mot` without `sens` fails the build. But *Canaga*, *Crua*, *Mfoa*
and *Rio de Senega* are attested spellings and place names, not words with a
meaning, and demanding a translation for them would invent one. `forme` takes a
source label instead. One rule could not have carried both cases.

**Prose wraps; a name does not.** The distinction is editorial, not a length
heuristic: a body is a sentence and wrapping it loses nothing, a name is an atom
and a broken name is a copy fault a human has to see.

## Sizes are for a 1080-wide frame and scale from there

Every number below is measured on the two approved masters at 1080 px wide. A
caller renders at another width by passing `width`, and nothing else changes.
"""
import pathlib

from PIL import Image, ImageDraw, ImageFont

import ethni_tokens

HARNESS = pathlib.Path(__file__).resolve().parent
REF_W = 1080

# The palette, read once from the charter rather than declared here. Both
# `ethni_render.py` and `ethni_card.py` used to carry their own copy of the gold,
# and the copy that won was `#FFD33D` — a value the brand never defined.
PALETTE = ethni_tokens.palette()

# Anton, TikTok Sans, Fraunces and Nunito Sans carry no Ethiopic and no polytonic
# Greek. The Noto faces (SIL OFL, see fonts/OFL-Noto.txt) are the fallback for a
# scene that has to show a name in its own script — and, measured here, the only
# face in the harness carrying the Khoekhoe clicks.
FACES = {"anton": "Anton-Regular.ttf", "sans": "TikTokSans-Bold.ttf",
         "brand": "Fraunces.ttf", "serif": "Fraunces.ttf", "nunito": "NunitoSans.ttf",
         "noto": "NotoSans-Bold.ttf",
         "ethiopic": "NotoSansEthiopic-Bold.ttf", "greek": "NotoSans-Bold.ttf"}

VARIABLE = ("brand", "serif", "nunito")

_fonts = {}
_notdef = {}


def font(size, face="anton", weight=800):
    key = (size, face, weight)
    if key not in _fonts:
        f = ImageFont.truetype(str(HARNESS / "fonts" / FACES[face]), size)
        if face in VARIABLE:
            # Fraunces and Nunito Sans ship as variable fonts whose default
            # instance is far too light for a title; pin the axis or the card
            # renders as a wisp. A production that assumed otherwise shipped thin.
            f.set_variation_by_axes(
                [weight if a["name"] in ["Weight", b"Weight"] else a["default"]
                 for a in f.get_variation_axes()])
        _fonts[key] = f
    return _fonts[key]


def assert_covered(text, face):
    """Refuse a string the face cannot draw, naming the character and the face.

    Nothing checked this, and the gap is not hypothetical. Neither production
    face carries the Khoekhoe clicks « ǀ ǃ », and carousel 6 puts Khoekhoe on a
    card — so the card whose whole subject is a people's own name would have
    rendered that name with a hole in it, in silence. `noto` carries them.

    A missing glyph maps to .notdef, so the test is whether the character draws
    the same bitmap as a codepoint guaranteed to be absent.
    """
    f = font(48, face, 800)
    if face not in _notdef:
        m = f.getmask("", mode="L")          # private use area, never mapped
        _notdef[face] = (m.size, bytes(m))
    for ch in text:
        if ch.isspace():
            continue
        m = f.getmask(ch, mode="L")
        if (m.size, bytes(m)) == _notdef[face]:
            raise AssertionError(
                f"la police « {face} » ({FACES[face]}) ne porte pas « {ch} » "
                f"(U+{ord(ch):04X}) dans : {text!r}. "
                f"Les faces qui le portent se testent avec assert_covered ; "
                f"« noto » couvre les clics et les diacritiques.")


# ── the roles ───────────────────────────────────────────────────────────────
#
# **Everything is white. Gold appears once per frame, on the name being examined.**
#
# The operator's ruling of 2026-09-09, on the first witness: « On commence de zéro
# avec toutes les typo : même taille, même couleur, et ensuite on met en avant. »
# The first pass had gold on the name, gold on the historical form and gold on the
# figure, three golds and two greys in one frame, and it read as chaos. So the
# accent is a scarce resource: `ACCENT_ROLES` lists what may spend it, and the
# renderers assert that a frame spends it at most once.
#
# `size`, `gap` and `offset` are pixels at REF_W. `second` is the subordinate line
# a role carries beneath its own: the meaning of a word, the label of a figure, the
# attribution of a quotation. `requires` names a field the role cannot be rendered
# without — it is how plain-language rule 5 becomes a build error.
ROLES = {
    # ── the opening block: series, subject, place, question ──
    # A viewer meets this channel mid-scroll and knows nothing. In this order they
    # learn that there is a series, what it is about, where on today's map that is,
    # and what is surprising about it — before a word is spoken.
    "serie":    {"face": "sans",  "size": 42,  "colour": "paper", "weight": 800,
                 "gap": 12, "upper": True},
    "nom":      {"face": "anton", "size": 232, "colour": "gold",  "weight": 800,
                 "gap": 10, "upper": True},
    "lieu":     {"face": "sans",  "size": 54,  "colour": "paper", "weight": 800,
                 "gap": 14, "upper": True, "wrap": True},
    "question": {"face": "anton", "size": 84,  "colour": "paper", "weight": 800,
                 "gap": 16, "upper": True, "wrap": True},

    # ── the body of an argument ──
    "titre":    {"face": "anton", "size": 88,  "colour": "paper", "weight": 800,
                 "gap": 16, "upper": True, "wrap": True},
    "corps":    {"face": "sans",  "size": 46,  "colour": "paper", "weight": 700,
                 "gap": 14, "upper": False, "wrap": True},
    "source":   {"face": "sans",  "size": 32,  "colour": "paper", "weight": 700,
                 "gap": 10, "upper": False, "wrap": True},
    "date":     {"face": "sans",  "size": 50,  "colour": "paper", "weight": 800,
                 "gap": 14, "upper": True},

    # ── the figures ──
    "chiffre":  {"face": "anton", "size": 190, "colour": "gold",  "weight": 800,
                 "gap": 14, "upper": True,
                 "second": {"key": "legende", "face": "sans", "size": 44,
                            "colour": "paper", "weight": 700, "upper": False,
                            "offset": 22}},
    "mot":      {"face": "anton", "size": 176, "colour": "gold",  "weight": 800,
                 "gap": 14, "upper": True,
                 "requires": "sens",
                 "second": {"key": "sens", "face": "sans", "size": 44,
                            "colour": "paper", "weight": 700, "upper": False,
                            "offset": 22}},
    # A historical spelling is evidence, not a restored name, so it does not take
    # the accent. On the first witness « CRUA » was gold beside a gold « KLAO » and
    # the two competed for the one thing the frame was about.
    "forme":    {"face": "anton", "size": 132, "colour": "paper", "weight": 800,
                 "gap": 14, "upper": True,
                 "second": {"key": "attestation", "face": "sans", "size": 34,
                            "colour": "paper", "weight": 700, "upper": False,
                            "offset": 20}},
    # A quotation is prose and it wraps, like every other prose role. It shipped
    # without `wrap` and no approved publication uses it, so nothing caught it:
    # measured 2026-09-09, « Insula S. Laurentii, vulgo Madagascar. » failed the
    # render at 1260 px in an 840 px box, and so did every quotation longer than
    # about thirty characters. A citation that does not wrap is a role that fails
    # the first time somebody reaches for it.
    "citation": {"face": "serif", "size": 66,  "colour": "paper", "weight": 700,
                 "gap": 18, "upper": False, "wrap": True,
                 "second": {"key": "attribution", "face": "sans", "size": 34,
                            "colour": "paper", "weight": 700, "upper": False,
                            "offset": 22}},
}

# The only roles allowed to be gold. A frame may spend the accent once.
ACCENT_ROLES = {role for role, spec in ROLES.items() if spec["colour"] == "gold"}


def accent_spend(cards, has_plaque=False):
    """How many gold elements a frame would carry. One is the ceiling."""
    return sum(1 for c in cards if c.get("role") in ACCENT_ROLES) + (1 if has_plaque else 0)


def _lines(value, upper):
    lines = [value] if isinstance(value, str) else list(value)
    return [l.upper() if upper else l for l in lines]


def _wrap(lines, f, maxw, measurer):
    """Break prose at the safe box. Explicit line breaks in the copy are kept."""
    out = []
    for line in lines:
        current = ""
        for word in line.split():
            trial = f"{current} {word}".strip()
            if current and measurer.textlength(trial, font=f) > maxw:
                out.append(current)
                current = word
            else:
                current = trial
        if current:
            out.append(current)
    return out


def measure(card, width=REF_W, maxw_frac=840 / REF_W):
    """Height the card will occupy, without drawing it.

    A block needs this to place its cards before any of them exists, which is how
    a stack can refuse to start rather than overflow halfway down.
    """
    return _layout(card, width, maxw_frac)[0]


def _layout(card, width, maxw_frac):
    """(total height, [(lines, font, colour, dy, face)]) for one card."""
    role = card.get("role")
    assert role in ROLES, f"rôle inconnu : {role!r} — connus : {sorted(ROLES)}"
    spec = ROLES[role]
    need = spec.get("requires")
    if need:
        # Plain language, rule 5: every African-language word carries its
        # plain-French meaning on the same card. No exception, so it is a gate.
        assert card.get(need), (
            f"le rôle « {role} » exige « {need} » : « {card.get('text')} » "
            f"ne peut pas paraître à l'écran sans son sens en français")
    k = width / REF_W
    maxw = width * maxw_frac
    measurer = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    parts, y = [], 0

    def add(value, face, size, colour, weight, upper, gap, wrap=False):
        nonlocal y
        f = font(round(size * k), face, weight)
        lines = _lines(value, upper)
        if wrap:
            lines = _wrap(lines, f, maxw, measurer)
        for line in lines:
            assert_covered(line, face)
            b = measurer.textbbox((0, 0), line, font=f)
            w = b[2] - b[0]
            # A line wider than the safe box is a layout fault, not something to
            # shrink silently: the copy and the size disagree and a human chooses.
            assert w <= maxw, (
                f"« {line} » fait {round(w)} px pour un cadre de {round(maxw)} px "
                f"(rôle « {role} », corps {round(size * k)}) — coupe la ligne "
                f"ou change de rôle, le moteur ne rétrécit pas")
            parts.append((line, f, PALETTE.get(colour, colour), y - b[1]))
            y += (b[3] - b[1]) + round(gap * k)
        y -= round(gap * k)

    # Only the primary line takes a face override, and only so a scene carrying a
    # script the production faces do not cover can name `noto` without inventing
    # a second role for it.
    add(card["text"], card.get("face", spec["face"]), spec["size"], spec["colour"],
        spec["weight"], spec["upper"], spec["gap"], spec.get("wrap", False))
    sec = spec.get("second")
    if sec and card.get(sec["key"]):
        y += round(sec["offset"] * k)
        add(card[sec["key"]], sec["face"], sec["size"], sec["colour"],
            sec["weight"], sec["upper"], sec.get("gap", 12), True)
    return y, parts


def draw(im, card, top, width=None, maxw_frac=840 / REF_W):
    """Composite one card, centred, with its first line's ink starting at `top`.

    Returns the ink bounding box actually drawn, so a caller can assert against
    its own furniture rather than trusting the arithmetic.
    """
    width = width or im.width
    _, parts = _layout(card, width, maxw_frac)
    d = ImageDraw.Draw(im)
    box = None
    for line, f, colour, dy in parts:
        b = d.textbbox((0, 0), line, font=f)
        x = (im.width - (b[2] - b[0])) / 2 - b[0]
        d.text((x, top + dy), line, font=f, fill=colour)
        here = (round(x + b[0]), round(top + dy + b[1]),
                round(x + b[2]), round(top + dy + b[3]))
        box = here if box is None else (min(box[0], here[0]), min(box[1], here[1]),
                                        max(box[2], here[2]), max(box[3], here[3]))
    return box


# ── the entrance ────────────────────────────────────────────────────────────
#
# Expo-out, from Motion's `cubic-bezier(0.16, 1, 0.3, 1)`, rather than the
# ease-out cubic the engine used before. The cubic reaches 90 % of its travel at
# t ≈ 0.55 and keeps drifting; this reaches it at t ≈ 0.25 and then holds. A card
# is a thing to read, not a thing to watch, and the motion should be over before
# the eye arrives.
#
# A spring was considered and rejected. Motion returns a 15 % overshoot ringing
# for half a second at bounce 0.15, and on a figure whose subject is a people's
# name being restored, a bounce makes a restitution look playful. The plate takes
# its drama from sequence instead.
ENTER_SECONDS = 0.38
ENTER_RISE = 24


def ease(t):
    """Expo-out on [0, 1], clamped."""
    t = max(0.0, min(1.0, t))
    return 1.0 if t >= 1.0 else 1 - 2 ** (-10 * t)


def enter(im, layer, t, start=0.0, dur=ENTER_SECONDS, rise=ENTER_RISE):
    """Composite `layer` at its entrance state for time `t`."""
    a = ease((t - start) / dur)
    if a <= 0:
        return
    if a < 1:
        layer = layer.copy()
        layer.putalpha(layer.getchannel("A").point(lambda x: round(x * a)))
    im.alpha_composite(layer, (0, round(rise * (1 - a))))
