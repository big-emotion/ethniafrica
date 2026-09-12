"""The only place a colour, a face or a type size enters the render scripts.

Two sources, and the split between them is deliberate:

- `docs/design/gabarits-social/tokens/colors.css` and `typography.css` — copied
  from the exported design system. They carry what the *brand* owns: the palette
  and the two faces.
- `docs/design/gabarits-social/GABARITS-SOCIAL.md` — carries what the
  *composition* owns: the three formats, the type scale in pixels, the layout
  choice, the licence arithmetic.

Both sit under `docs/` rather than next to this engine because the application
reads the same design system, and the spec documents a product surface. The
engine is one of two readers, not the owner.

The design system has no social type scale and is not going to grow one. Its
`--afh-text-*` are `clamp()` expressions in rem for a browser; a card is 1080 px
and its Anton figure is 216 px. So a size read from the spec is not a literal that
escaped the tokens — it is a value read from the file that owns it.

Why this module exists at all: `ethni_render.py` carried
`PALETTE = {"gold": "#FFD33D", ...}`, a logo gold spent on text, and nothing in the
repository could see that it disagreed with the charter. A value nobody can diff
against its source is a value that drifts.

Paths are resolved from this file, so the harness moves without edits and no
absolute path is ever written down.
"""
import pathlib
import re

HARNESS = pathlib.Path(__file__).resolve().parent
REPO = HARNESS.parents[1]
GABARITS = REPO / "docs" / "design" / "gabarits-social"
SPEC = GABARITS / "GABARITS-SOCIAL.md"
FONTS = HARNESS / "fonts"

# §6 — the enlargement ceiling, and the one line B allows under its word.
#
# There is no character threshold for A any more. A count was an approximation of
# « does the column hold », and a poor one: 199 characters on two short lines hold
# where 185 on four lines do not. The engine composes the column and measures it —
# see `colonne_A_tient`.
SUR_ECH_MAX = 2.0
CORPS_COURT = 90

# §6 — the same rule, verified again across the deck. A carousel where the image
# shrinks to a band card after card is no longer a carousel of images.
QUOTA_A_MIN = 0.60
QUOTA_C_MAX = 0.30
QUOTA_B_MAX = 2

# §1 — the platform interface covers the bottom 300 px of a 9:16 frame.
SAFE_FLOOR_9_16 = 1620

# §2 — one accent per surface, and the pillar decides which.
PILIER_ACCENT = {
    "L'atlas": "ocre",
    "Les dossiers": "teal",
    "Jouer": "perv",
}

# §2 — the same accent is a different ink on each ground.
ACCENT_TOKEN = {
    ("ocre", "nuit"): "--afh-night-ocre-soft",
    ("teal", "nuit"): "--afh-cat-teal",
    ("terre", "nuit"): "--afh-cat-terre-ink-night",
    ("perv", "nuit"): "--afh-cat-perv",
    ("ocre", "parchemin"): "--afh-cat-ocre-ink",
    ("teal", "parchemin"): "--afh-cat-teal-ink",
    ("terre", "parchemin"): "--afh-cat-terre-ink",
    ("perv", "parchemin"): "--afh-cat-perv-ink",
}

# §2 — decorative only. It fails AA at caption size, and a credit is a legal
# obligation, so it is the one place the failure is not cosmetic.
INK_REFUSED_FOR_CREDIT = "--afh-color-text-muted"

_declarations = None


def _load():
    """Every `--afh-*` declaration in the copied token files, `var()` resolved."""
    global _declarations
    if _declarations is not None:
        return _declarations

    raw = {}
    for name in ("colors.css", "typography.css", "motion.css"):
        text = (GABARITS / "tokens" / name).read_text(encoding="utf-8")
        # Comments first: `--afh-text-body: …; /* 17→19 */` would otherwise be read
        # as part of the value.
        text = re.sub(r"/\*(?:.|\n)*?\*/", "", text)
        # Drop at-rule blocks before reading. `motion.css` redefines every
        # duration to 0.01ms under `prefers-reduced-motion`, and keeping the last
        # declaration would adopt that override for everybody: the first read of
        # these tokens returned 1e-05 s for every duration, which in a video means
        # every block appearing at once, looking like a decision.
        text = re.sub(r"@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}", "", text)
        for prop, value in re.findall(r"(--afh-[\w-]+)\s*:\s*([^;]+);", text):
            raw[prop] = value.strip()

    def resolve(prop, seen=()):
        value = raw[prop]
        hop = re.fullmatch(r"var\((--afh-[\w-]+)\)", value)
        if not hop:
            return value
        target = hop.group(1)
        if target in seen:
            raise ValueError(f"{prop} boucle sur {target}")
        return resolve(target, seen + (prop,))

    _declarations = {p: resolve(p) for p in raw}
    return _declarations


def color(token):
    """A colour by its charter token name. Lower-cased, so a test can compare."""
    value = _load()[token]
    return value.lower() if value.startswith("#") else value


def accent(name, fond):
    """The ink for one of the four accents on one of the two grounds."""
    return color(ACCENT_TOKEN[(name, fond)])


def accent_for_pillar(pilier):
    return PILIER_ACCENT[pilier]


def credit_ink(fond, token=None):
    """The credit's ink, with the one token that may not carry it refused.

    A credit is where the attribution obligation is discharged. Setting it in a
    decorative grey does not soften the design, it voids the licence term.
    """
    if token == INK_REFUSED_FOR_CREDIT:
        raise ValueError(
            f"{INK_REFUSED_FOR_CREDIT} échoue AA en corps 19 px : un crédit "
            f"illisible ne vaut pas attribution")
    return color("--afh-night-ink-3" if fond == "nuit" else "--afh-color-text-soft")


def luminance(couleur):
    """Relative luminance of a hex colour, per WCAG."""
    rgb = couleur.lstrip("#")
    canaux = [int(rgb[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    canaux = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
              for c in canaux]
    return 0.2126 * canaux[0] + 0.7152 * canaux[1] + 0.0722 * canaux[2]


def _table_alpha():
    """§4's four rows: (luminance, threshold, alpha), read from the spec."""
    lignes = []
    for row in _tables()["4. Voiles (scrims)"]:
        if len(row) != 4 or row[0].startswith("Texte"):
            continue
        lum = _number(row[1].split("/")[0])
        seuil = _number(row[2])
        alpha = _number(row[3])
        if None not in (lum, seuil, alpha):
            lignes.append((lum, seuil, alpha))
    if not lignes:
        raise KeyError("§4 ne porte plus de table d'alpha")
    return lignes


# §4 — under this, display text goes to ink 1 and the accent takes refuge in the
# narration plate, which has an opaque ground of its own. One does not thicken a
# scrim to keep a gold: one moves the gold.
ALPHA_ACCENT = 0.84


def alpha_min(encre, seuil=3.0):
    """§4 — the alpha a scrim needs under `encre`, keyed on its luminance.

    **Never on the text's size.** A 150 px figure in the accent needs more scrim
    than a 32 px body in ink 1, because the accent carries a third less luminance.

    The row whose luminance is nearest, at or above the threshold asked for.
    """
    lum = luminance(encre)
    candidates = [(abs(l - lum), a) for l, s_, a in _table_alpha() if s_ >= seuil - 1e-9]
    if not candidates:
        raise KeyError(f"§4 n'a pas de ligne au seuil {seuil}")
    return min(candidates)[1]


def encre_affichage(alpha, accent_deck, encre1):
    """§4's corollary — which ink display text may take under a given scrim.

    Below the accent's own floor the gold does not survive, so the display goes to
    ink 1. The accent is not lost: it moves into the narration plate, where it
    marks one word on an opaque ground.
    """
    return accent_deck if alpha >= ALPHA_ACCENT else encre1


def duree(nom):
    """A motion duration in seconds. The tokens are authored in ms for a browser."""
    valeur = _load()[f"--afh-duration-{nom}"].strip()
    return float(valeur.rstrip("ms")) / 1000 if valeur.endswith("ms") else float(valeur)


def courbe(nom):
    """A named easing's four control points, or None for a keyword curve."""
    valeur = _load()[f"--afh-ease-{nom}"].strip()
    nombres = re.findall(r"-?\d*\.?\d+", valeur)
    return tuple(float(n) for n in nombres) if valeur.startswith("cubic-bezier") else None


# The reduced-motion contract, stated once. Under it every duration collapses and
# transforms are dropped — the charter's own words. A video renders this variant
# with the same scene durations and every block present from the first frame; it
# doubles as the visual control, because a still frame is easier to judge than a
# movement.
MOUVEMENT_REDUIT = {"duree": 0.0, "translation": 0}


def font_family(role):
    """`social` is Anton, `body` is Nunito Sans — read, not assumed."""
    return _load()[f"--afh-font-{role}"]


def font_file(filename):
    """The faces ship with the engine, not with the spec.

    They used to sit beside `GABARITS-SOCIAL.md`, in a second copy of the same
    three `.ttf` files the engine already carried. Two byte-identical copies of a
    face is one copy that can be updated alone, and a face updated alone
    re-renders the back catalogue without saying so.
    """
    return FONTS / filename


# ---------------------------------------------------------------- the spec

_spec_tables = None


def _tables():
    """The spec's markdown tables, keyed by the **section** they sit under.

    The section — a `##` heading — and not the nearest heading of any level. A
    sub-heading organises prose; it does not re-address the section's tables. Keyed
    on the nearest heading instead, moving the type scale under « Cinq rangs » made
    every size in the engine unreadable, and the failure read as a missing spec
    rather than as a moved one.
    """
    global _spec_tables
    if _spec_tables is not None:
        return _spec_tables

    _spec_tables, heading, rows = {}, None, []
    for line in SPEC.read_text(encoding="utf-8").splitlines():
        if line.startswith("#"):
            if rows:
                _spec_tables.setdefault(heading, []).extend(rows)
            rows = []
            if not line.startswith("###"):
                heading = line.lstrip("# ").strip()
        elif line.startswith("|"):
            # Emphasis is the spec's business, not the parser's: the day « Corps »
            # and « Crédit » were bolded to carry the 1,6 invariant, every size in
            # the engine stopped resolving.
            cells = [c.replace("**", "").strip() for c in line.strip("|").split("|")]
            if not all(set(c) <= set("-: ") for c in cells):  # skip the rule row
                rows.append(cells)
    if rows:
        _spec_tables.setdefault(heading, []).extend(rows)
    return _spec_tables


def _number(text):
    """First number in a cell, comma-decimal accepted, ranges taking the low end.

    The spec writes « 120–126 » where the composition may breathe and « 1,08 »
    in French decimals. Taking the low end of a range is the conservative read:
    a size that fits at 120 fits at 126 only if the box was measured for 126.
    """
    m = re.search(r"(\d+(?:[.,]\d+)?)", text.replace(" ", "").replace(" ", ""))
    return float(m.group(1).replace(",", ".")) if m else None


_FORMAT_KEYS = {
    "Carrousel Instagram / Facebook": "carrousel",
    "LinkedIn": "linkedin",
    "Reel / Story / Shorts": "reel",
}


def fmt(key):
    """One of the three outputs of §1: pixels, scale factor and bottom margin."""
    for row in _tables()["1. Formats"]:
        if row[0] == "Sortie":
            continue
        name = _FORMAT_KEYS.get(row[0])
        if name != key:
            continue
        w, h = (int(n) for n in re.findall(r"\d+", row[1].replace(" ", ""))[:2])
        return {
            "w": w,
            "h": h,
            "k": _number(row[2]),
            "marge_basse": int(_number(row[3])),
        }
    raise KeyError(f"{key} n'est pas un format de §1")


def type_role(name):
    """A row of the §3 type scale, in pixels at k = 1."""
    for row in _tables()["3. Typographie"]:
        # §3 carries two tables. The five ranks are four columns wide and say what
        # lives where; only the seven-column one gives a role its face and size.
        if len(row) < 7 or row[0] == "Rôle" or not row[0].startswith(name):
            continue
        return {
            "police": row[1],
            "corps": _number(row[2]),
            "interligne": _number(row[3]),
            "graisse": _number(row[4]),
            "casse": row[5],
            "couleur": row[6],
        }
    raise KeyError(f"{name} n'est pas un rôle de §3")


def type_size(name, format_key):
    """A role's body size at a format — §3's « multiplier par k », done once."""
    return round(type_role(name)["corps"] * fmt(format_key)["k"])


# ---------------------------------------------------------------- §6 and §7


# §6 — above this, a frame's corners are a backdrop rather than a scene. Measured
# on the four corners because a cutout is white *at the edges*, whatever sits in
# the middle.
DETOURE_SEUIL = 235


def est_detoure(image):
    """Whether an image is a subject cut out on a near-white ground.

    Full frame, such an image has nothing for a scrim to darken: the veil lands
    on white and reads as a grey haze. The four corners are sampled rather than
    the mean, since the subject itself may be dark.
    """
    if image is None:
        return False

    # Kept on the image itself: reducing a 3840 × 5284 scan to read sixteen corner
    # pixels costs 77 ms, and §6 asks the question on every card and every format.
    # The answer lives and dies with the object, so it can never go stale.
    connu = getattr(image, "_afh_detoure", None)
    if connu is not None:
        return connu

    petite = image.convert("RGB").resize((32, 32))
    pixels = petite.load()
    coins = [pixels[x, y] for x in (0, 1, 30, 31) for y in (0, 1, 30, 31)]
    moyennes = [sum(c) / 3 for c in coins]
    verdict = sum(moyennes) / len(moyennes) >= DETOURE_SEUIL
    try:
        image._afh_detoure = verdict
    except AttributeError:      # a frame that refuses attributes stays uncached
        pass
    return verdict


def choisir(carte, w, h, fmt_key, image=None, tient=None):
    """§6 — which of the three layouts a card gets.

    `w` and `h` are the image's real pixels. The spec is explicit that they come
    from the decoded file and never from its name, because the failure being
    prevented is a 900 px scan blown up ×3.6 into a texture.

    `tient` answers « does the composed A column hold ». It is a callable supplied
    by the composition engine, because answering it means composing: §6 states the
    rule, the engine takes the measurement. Called without it, only the rules that
    need no composition apply.
    """
    # B is the word that carries, with one line to explain it. Without that
    # allowance B does not exist at all — every opening card has a body, so none
    # ever meets the condition and the ceiling of two holds at zero, an exception
    # its own rule made impossible. What B refuses is the pair: a full-frame word
    # and a two-term table fight over the same centre.
    if (carte.get("role") in ("ouverture", "bascule")
            and not carte.get("paires")
            and len(carte.get("corps") or "") <= CORPS_COURT):
        return "B"

    # A figure earns no cartouche on its own: a figure sits very well on an image,
    # and that is precisely where it lands hardest.
    frame = fmt(fmt_key)
    if max(frame["w"] / w, frame["h"] / h) > SUR_ECH_MAX:
        return "C"

    # A cutout has no scene to darken, so full frame it becomes a grey field. It
    # belongs to « the image does not support full frame », alongside the
    # enlargement ceiling.
    if est_detoure(image):
        return "C"

    if tient is not None and not tient():
        return "C"
    return "A"


# §7 — share-alike is viral, and a later version absorbs an earlier one because
# both 2.0 and 3.0 carry the « later version with the same licence elements »
# clause. Ordered least to most constraining.
_LICENCE_RANK = [
    "domaine public",
    "CC0",
    "licence ouverte",
    "CC BY 2.0", "CC BY 3.0", "CC BY 4.0",
    "CC BY-SA 2.0", "CC BY-SA 3.0", "CC BY-SA 4.0",
]

# §7 and §11 — a message to the operator, never a printed field.
_NOTE_INTERNE = re.compile(
    r"à\s+(nommer|confirmer|compléter|vérifier|sourcer)|"
    r"\b(TODO|FIXME|à\s+faire)\b", re.I)


def licence_sortie(licences):
    """The most constraining licence of the lot, or None if one is not named.

    None is not « no licence » — it is « this lot cannot ship », and the caller
    is expected to treat it as a gate rather than a default.
    """
    rank = -1
    for raw in licences:
        text = (raw or "").strip()
        hit = next((i for i, l in enumerate(_LICENCE_RANK)
                    if l.lower() in text.lower()), None)
        if hit is None:
            return None
        rank = max(rank, hit)
    return _LICENCE_RANK[rank] if rank >= 0 else None


def note_interne(text):
    """True when a string is a note to the operator rather than publishable copy."""
    return bool(_NOTE_INTERNE.search(text or ""))


# ---------------------------------------------------------------- the palette

# The names the harness has always used, each bound to the charter token that
# actually holds its value. `gold` is the one that moved: it used to be `#FFD33D`,
# which is neither the lockup's `#f2ba36` nor any charter colour, and it was being
# spent on text. §0.4 assigns display text the soft ocre instead.
_PALETTE_TOKENS = {
    "paper": "--afh-color-bg",
    "ink": "--afh-color-text",
    "ink-soft": "--afh-color-text-soft",
    "gold": "--afh-night-ocre-soft",
    "ground": "--afh-night-ground",
    "night-ink": "--afh-night-ink",
    "night-ink-2": "--afh-night-ink-2",
    "night-ink-3": "--afh-night-ink-3",
    "teal": "--afh-cat-teal",
    "terra": "--afh-cat-terre",
    "perv": "--afh-cat-perv",
    # Ruled 2026-09-10: what the harness called `white` is the charter's lightest
    # ink, not pure white. Kept under its old name so every existing caller keeps
    # working, and so no session has to remember which of the two it meant.
    "white": "--afh-night-ink",
}

# Both values that had no token were ruled on 2026-09-10, and neither survived.
#
# `white` was pure `#FFFFFF`. It is in no charter of this project and it vibrates
# on a caption plate, so it now resolves to the charter's lightest ink.
#
# `green` was a second dark ground, `#142B25`, used behind a video text sheet. It
# is deleted rather than tokenised: the project already has a dark ground, and a
# second one nobody recorded is exactly the value that becomes a decision by
# habit. `PALETTE["green"]` no longer exists — a caller that wants a dark ground
# asks for `ground`.
#
# Nothing is quarantined any more. If a value with no token appears again, it
# goes here with the date it was found, and it does not get drawn until it is
# ruled on.
SANS_JETON: dict[str, str] = {}


def palette():
    """The engine's colour names, resolved through the charter every call.

    Returned fresh rather than cached as a module constant so that editing
    `tokens/colors.css` and re-running is enough to see the change — a cached
    palette is a second source of truth with a longer life than the file.
    """
    resolved = {name: color(token) for name, token in _PALETTE_TOKENS.items()}
    resolved.update(SANS_JETON)
    return resolved
