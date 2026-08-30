# Actions charter — the four shapes a click is allowed to take

What the interface owes anyone who is about to click. Each rule exists because
breaking it makes two different gestures look alike, or makes one gesture look
like two.

The audit that produced this charter counted **twenty distinct spellings** of
"go to this page" across the site, seven of them on the home alone, for three
intentions. Nothing was wrong with any one of them; what was wrong was that a
reader could not learn the interface, because the same promise never looked the
same twice.

Companion charters: `atlas-charter.md` (what the map asserts),
`typography-charter.md` (the type scale this one draws its sizes from),
`games-charter.md` (what the Jouer surface owes).

---

## 1. Colour varies. Shape does not.

**Colour is a modifier.** A link reads `var(--accent-ink)` and takes ochre on
Explorer, teal on Comprendre, periwinkle on Jouer, exactly as §2 of the atlas
charter requires — no component learns which accent it was rendered under.

**Shape is a sign.** Two shapes mean two things. A shape that carries no
distinct meaning is not a variant, it is noise, and it costs the reader the
ability to predict what a click will do.

So there are four shapes, and adding a fifth means naming the fifth thing it
means.

| Shape               | Says                    | Renders as                                 |
| ------------------- | ----------------------- | ------------------------------------------ |
| **A — action link** | goes to another page    | label + arrow, no container                |
| **B — inline link** | goes to another page    | underlined, inside a running sentence      |
| **C — button**      | _does_ something        | filled or outlined container, radius 14 px |
| **D — chip**        | one value among several | pill, radius full                          |

A and B carry the same promise and differ only by where they stand: B exists
because an arrow in the middle of a sentence breaks the line. Everything that
is not inside a sentence is A.

---

## 2. Form A — the action link

The default, and by a wide margin the most frequent. One component:
`src/components/ui/ActionLink.tsx`. The arrow is written there and nowhere else.

- **Label then arrow, always.** A directional link without its arrow is
  indistinguishable from body text that happens to be coloured.
- **`--afh-text-small` (16 px), weight 600.** The typography charter files
  control labels under `small`; four of the seven forms this charter replaces
  sat at 11.5, 13 or 14 px, which is how the same sentence ended up three
  sizes apart on one page.
- **Bare at rest. Underlined on hover and focus, and the arrow advances 4 px.**
  One affordance is enough, and the arrow is the one that says something the
  underline cannot: that the reader is _leaving this block_. Carrying both at
  rest is exactly what produced the three contradictory rest states the audit
  found — never underlined, underlined on hover, underlined always.
- **44 px minimum height**, from padding, never from the line box alone.

### The label survives every breakpoint

An action link never drops its label to save space. The verb is the promise;
an arrow on its own asks the reader to guess. Where a card becomes a row on a
small screen, the row keeps the words.

This overturns the previous behaviour of the home's axis cards, which set
`font-size: 0` on the label below 860 px and left a bare arrow — on a project
whose first rule is mobile-first.

---

## 3. Form B — the inline link

Underlined at rest, `underline-offset` 2, no arrow, inherits its size from the
prose around it.

**Only inside a running sentence.** A link alone in its own paragraph is not
inline; it is an action link that has lost its arrow. That distinction is the
whole rule, and it is the one worth checking at review: "is this in a
sentence?" decides between A and B every time.

---

## 4. Form C — the button

**A button does something. It does not go somewhere.** Submit, start a round,
answer, filter, open, close, copy. Navigation between editorial pages is
form A, whatever its visual weight.

One implementation: `src/components/ui/button.tsx`. It is not to be rebuilt by
hand — the audit found the primary button reconstructed in nine files, seven of
them setting `--accent` as a background through an inline style because the
primitive had no accent variant. It has one now: `variant="accent"` takes the
surface's accent, so a primary action on Jouer is periwinkle and one on
Explorer is ochre, neither of them learning which.

**No arrow inside a button.** The container is already the affordance; the
arrow would be a second one making a promise the button does not keep, since a
button is not a departure.

---

## 5. Form D — the chip

Pill, radius full, optional accent dot, no arrow, 44 px minimum.

Chips arrive in rows of three to eight. Eight arrows is noise, and an arrow
would over-promise: a chip carries a **facet**, not a destination — it says "I
am one of several of my kind, interchangeable, removable".

---

## 6. Radius means something

Three values. Each one says what kind of thing it wraps.

| Token               | Value | Means                             | Where                                            |
| ------------------- | ----- | --------------------------------- | ------------------------------------------------ |
| `--afh-radius-0`    | 0     | **the source apparatus**          | citations, tier marks, version banners, captions |
| `--afh-radius-lg`   | 14 px | **an action, or a content thing** | buttons, inputs, cards, panels, module tiles     |
| `--afh-radius-full` | full  | **a value among several**         | chips, filters, facets, entity pills             |

The sharp corner says _this is a document, not an application_ — the corpus's
citation apparatus is the one layer that must look auditable. The softened
rectangle is the card's own radius, and the card is the atlas's unit of
content. The pill says the thing is one of a set.

### Why controls and surfaces share one value

The codebase used to split them: `--afh-radius-base` (12 px) on the form
controls — button, input, select, textarea, tabs — and `--afh-radius-lg`
(14 px) on cards, alerts and panels. That reads like a real distinction and it
is not one, because **no reader can see two pixels**. A semantic difference
nobody can perceive is bookkeeping, not a sign, and this charter's whole claim
is that shape carries meaning. So the two collapse, onto the value already in
use three times as often.

`--afh-radius-base` and the other five steps stay in `radius.css` for internal
surfaces that are neither an action, a value, nor a source. What is forbidden
is that something the reader can click chooses its own.

**A control keeps the control radius wherever it stands** — including inside
the citation apparatus, whose sharp corner belongs to the block, not to the
copy button sitting in it.

Enforced for the `ui/` primitives by `charterPrimitives.test.tsx`, and beyond
them by `actionsCharter.test.tsx`.

---

## 7. A continuous control is not a click

The four shapes above are the four things a **click** may be. A control the
reader _drags_ is not a fifth shape of click — it is a different gesture — and
§1's rule still binds it: it may exist only where a distinct thing needs
saying, and that thing is **"the values between the ends are the point"**.

There is exactly one on the site: the atlas's projection morph bar
(`AtlasGlobe`, `projectionControl="morph"`), and this is the failure it exists
to prevent. The home's featured module and `/jouer/mercator` both make one
claim — a flat map lies about surface area — and the claim is only legible in
the movement: Tissot's indicatrices swell toward the poles on the plane and
shrink to a single size on the sphere, so what proves it is watching them do
that. ETNI-1360 consolidated the two globe engines and replaced the retired
one's labelled range with a two-state button. Both end states survived; the
demonstration did not. A reader pressing a button sees a before and an after
and has to take the middle on trust, which is the one thing this surface was
built not to ask of them.

So, wherever one is warranted:

- **It takes its own row**, never a slot in a strip of buttons. It needs a
  width to be draggable at all, and at 430 px a range squeezed between two
  pills wraps away from its own labels.
- **Both ends are named, at every width** — §2's rule, for the same reason.
  An unlabelled range asks the reader to guess which way is which.
- **It says what it is showing, not what number it is on.** `aria-valuetext`
  carries the state ("Carte plate", "Projection intermédiaire", "Globe"): a
  screen reader announcing « 47 » says nothing about a surface, while the
  sighted reader is getting the shape itself.
- **A readout states the claim at the position it is in.** Without it the
  middle of the drag is a shape changing for no stated reason.
- **Radius `--afh-radius-full` on the track and the thumb**, §6: the thumb is
  one value among the range's many, which is exactly what the pill says.
- **The thumb is the touch target**, 24 px, and the row is 44 px. A 4 px track
  is not something a finger can aim at.
- **Where it cannot act, it is withdrawn, not disabled.** A range that refuses
  to move reads as a broken page. `/jouer/mercator` pins the projection while
  a question stands and replaces the bar with the sentence saying why.

A surface gets the bar **or** the button, never both — two controls over one
value let a reader flatten the map with one and be told by the other that it
is round.

Contract: `src/components/atlas/__tests__/projectionMorphBar.test.tsx`.

---

## 8. What this charter does not cover

**Wording.** Whether a label reads "Lire la fiche" or "Découvrir", whether it
promises what the destination delivers — that is content design, and it is a
separate question from shape. Two links may be perfectly consistent in form and
still both be badly written.

**Icons other than the arrow.** Nothing here licenses a second glyph. A form
that needs one needs a reason first, and then a row in the table in §1.
